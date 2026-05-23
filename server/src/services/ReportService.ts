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

    const total = await ReconciliationResult.countDocuments(filter);
    const results = await ReconciliationResult.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

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
    const run = await ReconciliationRun.findOne({ runId }).lean();
    if (!run) {
      throw new Error(`Reconciliation run not found: ${runId}`);
    }
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
    const results = await ReconciliationResult.find({
      runId,
      category: { $in: ['unmatched_user', 'unmatched_exchange'] }
    }).lean();

    return results;
  }

  public static async generateCSVContent(runId: string): Promise<string> {
    const results = await ReconciliationResult.find({ runId }).lean();
    
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
