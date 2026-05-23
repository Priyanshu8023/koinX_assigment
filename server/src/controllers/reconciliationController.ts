import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import ReconciliationRun from '../models/ReconciliationRun.js';
import { IngestionService } from '../services/IngestionService.js';
import { MatchingEngine } from '../services/MatchingEngine.js';
import { ReportService } from '../services/ReportService.js';
import { DEFAULT_TOLERANCES } from '../config/constants.js';

export async function triggerReconciliation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userFilePath = path.resolve('../data/user_transactions.csv');
    const exchangeFilePath = path.resolve('../data/exchange_transactions.csv');

    if (!fs.existsSync(userFilePath) || !fs.existsSync(exchangeFilePath)) {
      res.status(400).json({
        title: 'Missing Source CSV Files',
        status: 400,
        detail: 'Reconciliation ledgers are missing. Please ensure user_transactions.csv and exchange_transactions.csv exist in the data folder.',
        instance: req.originalUrl
      });
      return;
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

    await IngestionService.ingestFiles(runId, userFilePath, exchangeFilePath);

    await MatchingEngine.matchTransactions(runId);

    const summaryData = await ReportService.getRunSummary(runId);

    res.status(201).json({
      success: true,
      runId,
      config: summaryData.config,
      summary: summaryData.summary,
      status: summaryData.status
    });

  } catch (error) {
    next(error);
  }
}
