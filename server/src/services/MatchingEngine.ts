import UserTransaction from '../models/UserTransaction.js';
import ExchangeTransaction from '../models/ExchangeTransaction.js';
import ReconciliationRun from '../models/ReconciliationRun.js';
import ReconciliationResult, { IReconciliationResult } from '../models/ReconciliationResult.js';
import { TYPE_EQUIVALENCES } from '../config/constants.js';

export class MatchingEngine {
  public static async matchTransactions(runId: string): Promise<void> {
    const run = await ReconciliationRun.findOne({ runId });
    if (!run) {
      throw new Error(`Reconciliation run not found: ${runId}`);
    }

    run.status = 'processing';
    await run.save();

    const config = run.config;

    try {
      console.log('\n--- [MATCHING] Fetching transactions for runId:', runId, '---');
      const userTxs = await UserTransaction.find({ runId, isValid: true, isDuplicate: false })
        .sort({ timestamp: 1 })
        .lean();
      const exchangeTxs = await ExchangeTransaction.find({ runId, isValid: true, isDuplicate: false })
        .sort({ timestamp: 1 })
        .lean();
      console.log('[MATCHING] Fetched user transactions:', userTxs.length);
      console.log('[MATCHING] Fetched exchange transactions:', exchangeTxs.length);

      const exchangeIndex = new Map<string, any[]>();
      for (const tx of exchangeTxs) {
        const key = `${tx.asset}_${tx.type}`;
        if (!exchangeIndex.has(key)) {
          exchangeIndex.set(key, []);
        }
        exchangeIndex.get(key)!.push(tx);
      }
      console.log('[MATCHING] Exchange index keys:', [...exchangeIndex.keys()]);

      const userIndex = new Map<string, any[]>();
      for (const tx of userTxs) {
        const key = `${tx.asset}_${tx.type}`;
        if (!userIndex.has(key)) {
          userIndex.set(key, []);
        }
        userIndex.get(key)!.push(tx);
      }
      console.log('[MATCHING] User index keys:', [...userIndex.keys()]);


      for (const group of exchangeIndex.values()) {
        group.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }

      const results: any[] = [];
      const matchedExchangeIds = new Set<string>();
      const matchedUserIds = new Set<string>();

      for (const userTx of userTxs) {
        const equivalentType = TYPE_EQUIVALENCES[userTx.type || ''];
        if (!equivalentType) continue;

        const candidateKey = `${userTx.asset}_${equivalentType}`;
        const candidates = exchangeIndex.get(candidateKey) || [];

        const validCandidates: Array<{ tx: any; timeDiffSec: number; qtyDiffPct: number; score: number }> = [];

        for (const candidate of candidates) {
          if (matchedExchangeIds.has(candidate._id.toString())) continue;

          
          const userTime = userTx.timestamp ? userTx.timestamp.getTime() : 0;
          const exchangeTime = candidate.timestamp ? candidate.timestamp.getTime() : 0;
          const timeDiffSec = Math.abs(userTime - exchangeTime) / 1000;
          if (timeDiffSec > config.timestampToleranceSec) continue;

          if (!userTx.quantity || !candidate.quantity) continue;
          const qtyDiff = Math.abs(userTx.quantity - candidate.quantity);
          const qtyDiffPct = (qtyDiff / userTx.quantity) * 100;
          if (qtyDiffPct > config.quantityTolerancePct) continue;

          const timeRatio = timeDiffSec / config.timestampToleranceSec;
          const qtyRatio = qtyDiffPct / config.quantityTolerancePct;
          const score = (timeRatio * 0.5) + (qtyRatio * 0.5);

          validCandidates.push({ tx: candidate, timeDiffSec, qtyDiffPct, score });
        }

        if (validCandidates.length > 0) {
          validCandidates.sort((a, b) => a.score - b.score);
          const best = validCandidates[0];

          matchedExchangeIds.add(best.tx._id.toString());
          matchedUserIds.add(userTx._id.toString());

          const priceMatch = userTx.priceUsd === best.tx.priceUsd;
          const feeMatch = userTx.fee === best.tx.fee;
          
          const isConflicting = !priceMatch || !feeMatch;
          const category = isConflicting ? 'conflicting' : 'matched';
          const reason = isConflicting 
            ? `Matched within tolerances, but has conflicts: ${!priceMatch ? 'Price mismatch. ' : ''}${!feeMatch ? 'Fee mismatch.' : ''}`
            : 'Perfect match within tolerances';

          const matchDetails = {
            timestampDiffSec: best.timeDiffSec,
            quantityDiffPct: best.qtyDiffPct,
            matchScore: best.score,
            fieldsCompared: {
              type: { user: userTx.type, exchange: best.tx.type, match: true },
              asset: { user: userTx.asset, exchange: best.tx.asset, match: true },
              quantity: { user: userTx.quantity, exchange: best.tx.quantity, match: true, diffPct: best.qtyDiffPct },
              priceUsd: { user: userTx.priceUsd, exchange: best.tx.priceUsd, match: priceMatch },
              fee: { user: userTx.fee, exchange: best.tx.fee, match: feeMatch }
            }
          };

          results.push({
            runId,
            category,
            reason,
            userTransaction: userTx,
            exchangeTransaction: best.tx,
            matchDetails
          });
        }
      }

      for (const userTx of userTxs) {
        if (!matchedUserIds.has(userTx._id.toString())) {
          const equivalentType = TYPE_EQUIVALENCES[userTx.type || ''];
          const candidates = exchangeIndex.get(`${userTx.asset}_${equivalentType}`) || [];
          const reason = MatchingEngine.getUnmatchedDiagnosticReason(userTx, candidates, config, 'user');
          results.push({
            runId,
            category: 'unmatched_user',
            reason,
            userTransaction: userTx,
            exchangeTransaction: null,
            matchDetails: null
          });
        }
      }

      for (const exchangeTx of exchangeTxs) {
        if (!matchedExchangeIds.has(exchangeTx._id.toString())) {
          const equivalentType = TYPE_EQUIVALENCES[exchangeTx.type || ''];
          const candidates = userIndex.get(`${exchangeTx.asset}_${equivalentType}`) || [];
          const reason = MatchingEngine.getUnmatchedDiagnosticReason(exchangeTx, candidates, config, 'exchange');
          results.push({
            runId,
            category: 'unmatched_exchange',
            reason,
            userTransaction: null,
            exchangeTransaction: exchangeTx,
            matchDetails: null
          });
        }
      }

      if (results.length > 0) {
        await ReconciliationResult.insertMany(results);
      }
      const matchedCount = results.filter(r => r.category === 'matched').length;
      const conflictingCount = results.filter(r => r.category === 'conflicting').length;
      const unmatchedUserCount = results.filter(r => r.category === 'unmatched_user').length;
      const unmatchedExchangeCount = results.filter(r => r.category === 'unmatched_exchange').length;

      console.log('[MATCHING] Results summary:');
      console.log('  Matched:', matchedCount);
      console.log('  Conflicting:', conflictingCount);
      console.log('  Unmatched User:', unmatchedUserCount);
      console.log('  Unmatched Exchange:', unmatchedExchangeCount);
      console.log('  Total results:', results.length);

      const flaggedUser = await UserTransaction.countDocuments({ runId, isValid: false });
      const flaggedExchange = await ExchangeTransaction.countDocuments({ runId, isValid: false });
      console.log('  Flagged (invalid) rows → user:', flaggedUser, '| exchange:', flaggedExchange);

      run.status = 'completed';
      run.completedAt = new Date();
      run.summary = {
        matched: matchedCount,
        conflicting: conflictingCount,
        unmatchedUser: unmatchedUserCount,
        unmatchedExchange: unmatchedExchangeCount,
        totalProcessed: results.length,
        flaggedRows: {
          user: flaggedUser,
          exchange: flaggedExchange
        }
      };

      await run.save();
      console.log('--- [MATCHING] Done ---\n');
    } catch (error: any) {
      run.status = 'failed';
      run.completedAt = new Date();
      run.errorMessage = error.message;
      await run.save();
      throw error;
    }
  }

  private static getUnmatchedDiagnosticReason(
    tx: any,
    candidates: any[],
    config: { timestampToleranceSec: number; quantityTolerancePct: number },
    perspective: 'user' | 'exchange'
  ): string {
    const peerPerspective = perspective === 'user' ? 'exchange' : 'user';
    const targetType = TYPE_EQUIVALENCES[tx.type || ''];

    if (candidates.length === 0) {
      return `No transactions found in ${peerPerspective} ledger for asset ${tx.asset} and type ${targetType}.`;
    }

    let minTimeDiff: number | null = null;
    let minQtyDiffPct: number | null = null;

    for (const candidate of candidates) {
      const txTime = tx.timestamp ? tx.timestamp.getTime() : 0;
      const candidateTime = candidate.timestamp ? candidate.timestamp.getTime() : 0;
      const timeDiffSec = Math.abs(txTime - candidateTime) / 1000;

      if (minTimeDiff === null || timeDiffSec < minTimeDiff) {
        minTimeDiff = timeDiffSec;
      }

      if (tx.quantity && candidate.quantity) {
        const qtyDiff = Math.abs(tx.quantity - candidate.quantity);
        const qtyDiffPct = (qtyDiff / tx.quantity) * 100;
        if (minQtyDiffPct === null || qtyDiffPct < minQtyDiffPct) {
          minQtyDiffPct = qtyDiffPct;
        }
      }
    }

    // Case 1: Time-proximate candidates exist, but quantity is out of bounds
    const timeProximateCandidates = candidates.filter(c => {
      const txTime = tx.timestamp ? tx.timestamp.getTime() : 0;
      const candidateTime = c.timestamp ? c.timestamp.getTime() : 0;
      return (Math.abs(txTime - candidateTime) / 1000) <= config.timestampToleranceSec;
    });

    if (timeProximateCandidates.length > 0) {
      let bestQtyDiff: number | null = null;
      for (const c of timeProximateCandidates) {
        const qtyDiff = Math.abs(tx.quantity - c.quantity);
        const qtyDiffPct = (qtyDiff / tx.quantity) * 100;
        if (bestQtyDiff === null || qtyDiffPct < bestQtyDiff) {
          bestQtyDiff = qtyDiffPct;
        }
      }
      return `Time-proximate ${peerPerspective} transactions exist, but quantity difference exceeds tolerance (closest diff: ${bestQtyDiff?.toFixed(2)}%, tolerance: ${config.quantityTolerancePct}%).`;
    }

    // Case 2: Quantity-proximate candidates exist, but timestamp is out of bounds
    const qtyProximateCandidates = candidates.filter(c => {
      const qtyDiff = Math.abs(tx.quantity - c.quantity);
      const qtyDiffPct = (qtyDiff / tx.quantity) * 100;
      return qtyDiffPct <= config.quantityTolerancePct;
    });

    if (qtyProximateCandidates.length > 0) {
      let bestTimeDiff: number | null = null;
      for (const c of qtyProximateCandidates) {
        const txTime = tx.timestamp ? tx.timestamp.getTime() : 0;
        const candidateTime = c.timestamp ? c.timestamp.getTime() : 0;
        const timeDiffSec = Math.abs(txTime - candidateTime) / 1000;
        if (bestTimeDiff === null || timeDiffSec < bestTimeDiff) {
          bestTimeDiff = timeDiffSec;
        }
      }
      return `Quantity-matched ${peerPerspective} transactions exist, but time difference exceeds tolerance (closest diff: ${bestTimeDiff}s, tolerance: ${config.timestampToleranceSec}s).`;
    }

    // Case 3: Both out of bounds
    return `Closest candidate found in ${peerPerspective} ledger is outside tolerance bounds (time diff: ${minTimeDiff}s / tol: ${config.timestampToleranceSec}s, qty diff: ${minQtyDiffPct?.toFixed(2)}% / tol: ${config.quantityTolerancePct}%).`;
  }
}
