import ReconciliationRun from '../models/ReconciliationRun.js';
import ReconciliationResult from '../models/ReconciliationResult.js';

export class ReportService {
  public static async getReportData(
    runId: string,
    page: number = 1,
    limit: number = 50,
    category?: string
  ) {
    const filter: any = { runId };
    if (category) {
      filter.category = category;
    }
    console.log('[REPORT_SERVICE] getReportData → filter:', JSON.stringify(filter));

    const total = await ReconciliationResult.countDocuments(filter);
    console.log('[REPORT_SERVICE] Total matching documents:', total);
    const results = await ReconciliationResult.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    console.log('[REPORT_SERVICE] Fetched', results.length, 'results (page', page, 'of', Math.ceil(total / limit), ')');

    return {
      results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  public static async getRunSummary(runId: string) {
    console.log('[REPORT_SERVICE] getRunSummary → fetching run:', runId);
    const run = await ReconciliationRun.findOne({ runId }).lean();
    if (!run) {
      console.log('[REPORT_SERVICE] Run NOT found:', runId);
      throw new Error(`Reconciliation run not found: ${runId}`);
    }
    console.log('[REPORT_SERVICE] Run found → status:', run.status);
    return {
      runId,
      status: run.status,
      config: run.config,
      summary: run.summary,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      errorMessage: run.errorMessage
    };
  }

  public static async getUnmatched(runId: string) {
    console.log('[REPORT_SERVICE] getUnmatched → fetching for runId:', runId);
    const results = await ReconciliationResult.find({
      runId,
      category: { $in: ['unmatched_user', 'unmatched_exchange'] }
    }).lean();
    console.log('[REPORT_SERVICE] Unmatched results fetched:', results.length);

    return results;
  }

  public static async generateCSVContent(runId: string): Promise<string> {
    console.log('[REPORT_SERVICE] generateCSVContent → fetching all results for runId:', runId);
    const results = await ReconciliationResult.find({ runId }).lean();
    console.log('[REPORT_SERVICE] CSV: total rows to export:', results.length);
    
    const headers = [
      'Status',
      'Reason',
      'User Tx ID',
      'User Timestamp',
      'User Type',
      'User Asset',
      'User Quantity',
      'User Price USD',
      'User Fee',
      'User Note',
      'Exchange Tx ID',
      'Exchange Timestamp',
      'Exchange Type',
      'Exchange Asset',
      'Exchange Quantity',
      'Exchange Price USD',
      'Exchange Fee',
      'Exchange Note',
      'Timestamp Diff (sec)',
      'Quantity Diff (%)'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (val instanceof Date) return val.toISOString();
      let str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];

    for (const r of results) {
      const u = r.userTransaction || {};
      const e = r.exchangeTransaction || {};
      const d = r.matchDetails;

      const row = [
        r.category,
        r.reason,
        u.transactionId || '',
        u.timestamp || '',
        u.type || '',
        u.asset || '',
        u.quantity !== undefined ? u.quantity : '',
        u.priceUsd !== undefined ? u.priceUsd : '',
        u.fee !== undefined ? u.fee : '',
        u.note || '',
        e.transactionId || '',
        e.timestamp || '',
        e.type || '',
        e.asset || '',
        e.quantity !== undefined ? e.quantity : '',
        e.priceUsd !== undefined ? e.priceUsd : '',
        e.fee !== undefined ? e.fee : '',
        e.note || '',
        d && d.timestampDiffSec !== null && d.timestampDiffSec !== undefined ? d.timestampDiffSec : '',
        d && d.quantityDiffPct !== null && d.quantityDiffPct !== undefined ? d.quantityDiffPct : ''
      ];

      csvRows.push(row.map(escapeCsv).join(','));
    }

    return csvRows.join('\n');
  }
}
