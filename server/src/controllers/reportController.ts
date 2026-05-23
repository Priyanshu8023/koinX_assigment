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

    console.log(`\n[REPORT] GET /report/${runId} → page=${page}, limit=${limit}, category=${category || 'all'}, format=${req.query.format || 'json'}`);

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
      console.log('[REPORT] Generating CSV export for runId:', runId);
      const csvContent = await ReportService.generateCSVContent(runId);
      console.log('[REPORT] CSV generated, length:', csvContent.length, 'chars');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${runId}_reconciliation_report.csv"`);
      res.status(200).send(csvContent);
      return;
    }

    const reportData = await ReportService.getReportData(runId, page, limit, category);
    console.log('[REPORT] Fetched results:', reportData.results.length, '| Total:', reportData.pagination.total, '| Pages:', reportData.pagination.pages);
    
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
    console.log(`\n[SUMMARY] GET /report/${runId}/summary`);

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
    console.log('[SUMMARY] Run status:', summaryData.status);
    console.log('[SUMMARY] Summary data:', JSON.stringify(summaryData.summary, null, 2));
    
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
    console.log(`\n[UNMATCHED] GET /report/${runId}/unmatched`);

     
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
    console.log('[UNMATCHED] Fetched', unmatched.length, 'unmatched records');

    const formattedUnmatched = unmatched.map(item => ({
      category: item.category,
      reason: item.reason,
      userTransaction: item.userTransaction,
      exchangeTransaction: item.exchangeTransaction
    }));

    console.log('[UNMATCHED] Unmatched user:', formattedUnmatched.filter(u => u.category === 'unmatched_user').length);
    console.log('[UNMATCHED] Unmatched exchange:', formattedUnmatched.filter(u => u.category === 'unmatched_exchange').length);

    res.status(200).json({
      success: true,
      runId,
      unmatched: formattedUnmatched
    });

  } catch (error) {
    next(error);
  }
}
