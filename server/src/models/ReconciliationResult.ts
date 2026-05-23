import mongoose, { Schema } from 'mongoose';

export interface IFieldCompareResult<T = any> {
  user: T;
  exchange: T;
  match: boolean;
}

export interface IQuantityCompareResult {
  user: number;
  exchange: number;
  match: boolean;
  diffPct: number;
}

export interface IMatchDetails {
  timestampDiffSec: number | null;
  quantityDiffPct: number | null;
  matchScore: number | null;
  fieldsCompared: {
    type: IFieldCompareResult<string> | null;
    asset: IFieldCompareResult<string> | null;
    quantity: IQuantityCompareResult | null;
    priceUsd: IFieldCompareResult<number | null> | null;
    fee: IFieldCompareResult<number | null> | null;
  } | null;
}

export interface IReconciliationResult {
  runId: string;
  category: 'matched' | 'conflicting' | 'unmatched_user' | 'unmatched_exchange';
  reason: string;
  userTransaction?: any;  
  exchangeTransaction?: any;
  matchDetails?: IMatchDetails | null;
}

const ReconciliationResultSchema = new Schema<IReconciliationResult>({
  runId: { 
    type: String, 
    required: true, 
    index: true 
  },
  category: { 
    type: String, 
    enum: ['matched', 'conflicting', 'unmatched_user', 'unmatched_exchange'], 
    required: true 
  },
  reason: { 
    type: String, 
    required: true 
  },

  userTransaction: { 
    type: Schema.Types.Mixed, 
    default: null 
  },
  exchangeTransaction: { 
    type: Schema.Types.Mixed, 
    default: null 
  },

  matchDetails: {
    type: {
      timestampDiffSec: { type: Number, default: null },
      quantityDiffPct: { type: Number, default: null },
      matchScore: { type: Number, default: null },
      fieldsCompared: {
        type: {
          type: {
            user: { type: String },
            exchange: { type: String },
            match: { type: Boolean }
          },
          default: null
        },
        asset: {
          type: {
            user: { type: String },
            exchange: { type: String },
            match: { type: Boolean }
          },
          default: null
        },
        quantity: {
          type: {
            user: { type: Number },
            exchange: { type: Number },
            match: { type: Boolean },
            diffPct: { type: Number }
          },
          default: null
        },
        priceUsd: {
          type: {
            user: { type: Number, default: null },
            exchange: { type: Number, default: null },
            match: { type: Boolean }
          },
          default: null
        },
        fee: {
          type: {
            user: { type: Number, default: null },
            exchange: { type: Number, default: null },
            match: { type: Boolean }
          },
          default: null
        }
      }
    },
    default: null
  }
}, {
  timestamps: true,
  collection: 'reconciliation_results'
});

ReconciliationResultSchema.index({ runId: 1, category: 1 });

const ReconciliationResult = mongoose.model<IReconciliationResult>('ReconciliationResult', ReconciliationResultSchema);
export default ReconciliationResult;
