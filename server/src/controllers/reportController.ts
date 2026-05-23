import { Request, Response, NextFunction } from 'express';
import ReconciliationRun from '../models/ReconciliationRun.js';
import { ReportService } from '../services/ReportService.js';


export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const runId = req.params.runId as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const category = req.query.category as string | undefined;

    const runExists = await ReconciliationRun.exists({ runId });
    if (!runExists) {
      res.status(404).json({
        title: 'Reconciliation Run Not Found',
        status: 404,
        detail: `No reconciliation run found with ID: '${runId}'`,
        instance: req.originalUrl
      });
      return;
    }

     
    if (req.query.format === 'csv') {
      const csvContent = await ReportService.generateCSVContent(runId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${runId}_reconciliation_report.csv"`);
      res.status(200).send(csvContent);
      return;
    }

    const reportData = await ReportService.getReportData(runId, page, limit, category);
    
    res.status(200).json({
      success: true,
      runId,
      pagination: reportData.pagination,
      results: reportData.results
    });

  } catch (error) {
    next(error);
  }
}

 
export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const runId = req.params.runId as string;

    const runExists = await ReconciliationRun.exists({ runId });
    if (!runExists) {
      res.status(404).json({
        title: 'Reconciliation Run Not Found',
        status: 404,
        detail: `No reconciliation run found with ID: '${runId}'`,
        instance: req.originalUrl
      });
      return;
    }

    const summaryData = await ReportService.getRunSummary(runId);
    
    res.status(200).json({
      success: true,
      runId,
      status: summaryData.status,
      config: summaryData.config,
      summary: summaryData.summary
    });

  } catch (error) {
    next(error);
  }
}

 
export async function getUnmatchedRecords(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const runId = req.params.runId as string;

     
    const runExists = await ReconciliationRun.exists({ runId });
    if (!runExists) {
      res.status(404).json({
        title: 'Reconciliation Run Not Found',
        status: 404,
        detail: `No reconciliation run found with ID: '${runId}'`,
        instance: req.originalUrl
      });
      return;
    }

    const unmatched = await ReportService.getUnmatched(runId);

    const formattedUnmatched = unmatched.map(item => ({
      category: item.category,
      reason: item.reason,
      userTransaction: item.userTransaction,
      exchangeTransaction: item.exchangeTransaction
    }));

    res.status(200).json({
      success: true,
      runId,
      unmatched: formattedUnmatched
    });

  } catch (error) {
    next(error);
  }
}
