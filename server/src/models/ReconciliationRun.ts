import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';

export interface IReconciliationRun {
  runId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: {
    timestampToleranceSec: number;
    quantityTolerancePct: number;
  };
  summary: {
    matched: number;
    conflicting: number;
    unmatchedUser: number;
    unmatchedExchange: number;
    totalProcessed: number;
    flaggedRows: {
      user: number;
      exchange: number;
    };
  };
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

interface ReconciliationRunModel extends Model<IReconciliationRun> {
  generateNextRunId(): Promise<string>;
}

const ReconciliationRunSchema = new Schema<IReconciliationRun, ReconciliationRunModel>({
  runId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  config: {
    timestampToleranceSec: { type: Number, required: true },
    quantityTolerancePct: { type: Number, required: true }
  },
  summary: {
    matched: { type: Number, default: 0 },
    conflicting: { type: Number, default: 0 },
    unmatchedUser: { type: Number, default: 0 },
    unmatchedExchange: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    flaggedRows: {
      user: { type: Number, default: 0 },
      exchange: { type: Number, default: 0 }
    }
  },
  startedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  errorMessage: { 
    type: String, 
    default: null 
  }
}, {
  timestamps: true,
  collection: 'reconciliation_runs'
});

ReconciliationRunSchema.statics.generateNextRunId = async function(): Promise<string> {
  return crypto.randomBytes(4).toString('hex');  
};

const ReconciliationRun = mongoose.model<IReconciliationRun, ReconciliationRunModel>('ReconciliationRun', ReconciliationRunSchema);
export default ReconciliationRun;
