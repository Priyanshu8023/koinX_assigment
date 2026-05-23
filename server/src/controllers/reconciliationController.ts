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
    const userCsvContent = req.body?.userCsvContent;
    const exchangeCsvContent = req.body?.exchangeCsvContent;

    const userSource = userCsvContent || path.resolve('../data/user_transactions.csv');
    const exchangeSource = exchangeCsvContent || path.resolve('../data/exchange_transactions.csv');

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

    const runId = await ReconciliationRun.generateNextRunId();
    const run = new ReconciliationRun({
      runId,
      config: {
        timestampToleranceSec,
        quantityTolerancePct
      }
    });
    await run.save();

    await IngestionService.ingestFiles(runId, userSource, exchangeSource);

    await MatchingEngine.matchTransactions(runId);

    res.status(201).json({
      success: true,
      runId,
      status: 'completed'
    });

  } catch (error) {
    next(error);
  }
}
