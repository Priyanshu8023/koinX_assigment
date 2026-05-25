import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import ReconciliationRun from '../models/ReconciliationRun.js';
import { IngestionService } from '../services/IngestionService.js';
import { MatchingEngine } from '../services/MatchingEngine.js';
import { DEFAULT_TOLERANCES } from '../config/constants.js';

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

    console.log('[RECONCILIATION] userCsvContent provided:', !!userCsvContent, userCsvContent ? `(${userCsvContent.length} chars)` : '');
    console.log('[RECONCILIATION] exchangeCsvContent provided:', !!exchangeCsvContent, exchangeCsvContent ? `(${exchangeCsvContent.length} chars)` : '');

    const userSource = userCsvContent || path.resolve('src/data/user_transactions.csv');
    const exchangeSource = exchangeCsvContent || path.resolve('src/data/exchange_transactions.csv');

    console.log('[RECONCILIATION] User source:', typeof userSource === 'string' && !userCsvContent ? userSource : '<csv-content>');
    console.log('[RECONCILIATION] Exchange source:', typeof exchangeSource === 'string' && !exchangeCsvContent ? exchangeSource : '<csv-content>');

    if (!userCsvContent || !exchangeCsvContent) {
      if (typeof userSource === 'string' && !fs.existsSync(userSource)) {
        res.status(400).json({
          title: 'Missing Source CSV Files',
          status: 400,
          detail: 'Reconciliation ledgers are missing. Please ensure user_transactions.csv exists in the data folder or upload it.',
          instance: req.originalUrl
        });
        return;
      }
      if (typeof exchangeSource === 'string' && !fs.existsSync(exchangeSource)) {
        res.status(400).json({
          title: 'Missing Source CSV Files',
          status: 400,
          detail: 'Reconciliation ledgers are missing. Please ensure exchange_transactions.csv exists in the data folder or upload it.',
          instance: req.originalUrl
        });
        return;
      }
    }

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
