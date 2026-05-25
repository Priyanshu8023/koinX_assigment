import { Request, Response, NextFunction } from 'express';
import ReconciliationRun from '../models/ReconciliationRun.js';
import { IngestionService } from '../services/IngestionService.js';
import { MatchingEngine } from '../services/MatchingEngine.js';
import { DEFAULT_TOLERANCES } from '../config/constants.js';
import { defaultUserCsv, defaultExchangeCsv } from '../data/data.js';

export async function triggerReconciliation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('\n========== [RECONCILIATION] Triggered ==========');
    console.log('[RECONCILIATION] Request body keys:', Object.keys(req.body || {}));

    const userCsvContent = req.body?.userCsvContent;
    const exchangeCsvContent = req.body?.exchangeCsvContent;

    // Validate types — must be strings if provided
    if (userCsvContent !== undefined && typeof userCsvContent !== 'string') {
      res.status(400).json({ title: 'Bad Request', status: 400, detail: 'userCsvContent must be a string.', instance: req.originalUrl });
      return;
    }
    if (exchangeCsvContent !== undefined && typeof exchangeCsvContent !== 'string') {
      res.status(400).json({ title: 'Bad Request', status: 400, detail: 'exchangeCsvContent must be a string.', instance: req.originalUrl });
      return;
    }

    console.log('[RECONCILIATION] userCsvContent provided:', !!userCsvContent, userCsvContent ? `(${userCsvContent.length} chars)` : '');
    console.log('[RECONCILIATION] exchangeCsvContent provided:', !!exchangeCsvContent, exchangeCsvContent ? `(${exchangeCsvContent.length} chars)` : '');

    // Resolve sources: prefer uploaded content, then fall back to bundled/compiled default datasets
    const userSource = userCsvContent || defaultUserCsv;
    const exchangeSource = exchangeCsvContent || defaultExchangeCsv;

    console.log('[RECONCILIATION] User source: <csv-content>');
    console.log('[RECONCILIATION] Exchange source: <csv-content>');

    const timestampToleranceSec = Number(req.body?.timestampToleranceSec) ||
      Number(process.env.TIMESTAMP_TOLERANCE_SECONDS) ||
      DEFAULT_TOLERANCES.TIMESTAMP_TOLERANCE_SECONDS;

    const quantityTolerancePct = Number(req.body?.quantityTolerancePct) ||
      Number(process.env.QUANTITY_TOLERANCE_PCT) ||
      DEFAULT_TOLERANCES.QUANTITY_TOLERANCE_PCT;

    console.log('[RECONCILIATION] Config → timestampToleranceSec:', timestampToleranceSec);
    console.log('[RECONCILIATION] Config → quantityTolerancePct:', quantityTolerancePct);

    const runId = await ReconciliationRun.generateNextRunId();
    console.log('[RECONCILIATION] Generated runId:', runId);

    const run = new ReconciliationRun({
      runId,
      config: {
        timestampToleranceSec,
        quantityTolerancePct
      }
    });
    await run.save();
    console.log('[RECONCILIATION] Run saved to DB');

    console.log('[RECONCILIATION] Starting ingestion...');
    await IngestionService.ingestFiles(runId, userSource, exchangeSource);
    console.log('[RECONCILIATION] Ingestion complete');

    console.log('[RECONCILIATION] Starting matching engine...');
    await MatchingEngine.matchTransactions(runId);
    console.log('[RECONCILIATION] Matching complete');

    console.log('[RECONCILIATION] ✅ Reconciliation finished successfully for runId:', runId);
    console.log('========== [RECONCILIATION] Done ==========\n');

    res.status(201).json({
      success: true,
      runId,
      status: 'completed'
    });

  } catch (error) {
    next(error);
  }
}

