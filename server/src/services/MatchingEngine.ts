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
      const userTxs = await UserTransaction.find({ runId, isValid: true, isDuplicate: false }).lean();
      const exchangeTxs = await ExchangeTransaction.find({ runId, isValid: true, isDuplicate: false }).lean();

      const exchangeIndex = new Map<string, any[]>();
      for (const tx of exchangeTxs) {
        const key = `${tx.asset}_${tx.type}`;
        if (!exchangeIndex.has(key)) {
          exchangeIndex.set(key, []);
        }
        exchangeIndex.get(key)!.push(tx);
      }


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
          results.push({
            runId,
            category: 'unmatched_user',
            reason: 'No equivalent exchange transaction found within tolerances',
            userTransaction: userTx,
            exchangeTransaction: null,
            matchDetails: null
          });
        }
      }

      for (const exchangeTx of exchangeTxs) {
        if (!matchedExchangeIds.has(exchangeTx._id.toString())) {
          results.push({
            runId,
            category: 'unmatched_exchange',
            reason: 'No equivalent user transaction found within tolerances',
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

      const flaggedUser = await UserTransaction.countDocuments({ runId, isValid: false });
      const flaggedExchange = await ExchangeTransaction.countDocuments({ runId, isValid: false });

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
    } catch (error: any) {
      run.status = 'failed';
      run.completedAt = new Date();
      run.errorMessage = error.message;
      await run.save();
      throw error;
    }
  }
}
