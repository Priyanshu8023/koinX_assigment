import mongoose, { Schema } from 'mongoose';

export interface IExchangeTransaction {
  runId: string;
  transactionId: string;
  rawTimestamp?: string;
  rawType?: string;
  rawAsset?: string;
  rawQuantity?: string;
  rawPriceUsd?: string;
  rawFee?: string;
  rawNote?: string;
  timestamp: Date | null;
  type: string | null;
  asset: string | null;
  quantity: number | null;
  priceUsd: number | null;
  fee: number;
  note?: string;

  rowNumber: number;
  isValid: boolean;
  isDuplicate: boolean;
  validationErrors: string[];
}

const ExchangeTransactionSchema = new Schema<IExchangeTransaction>({
  runId: { 
    type: String, 
    required: true, 
    index: true 
  },
  transactionId: { 
    type: String, 
    required: true 
  },
  
  rawTimestamp: { type: String },
  rawType: { type: String },
  rawAsset: { type: String },
  rawQuantity: { type: String },
  rawPriceUsd: { type: String },
  rawFee: { type: String },
  rawNote: { type: String },

  timestamp: { type: Date, default: null },
  type: { type: String, default: null },
  asset: { type: String, default: null },
  quantity: { type: Number, default: null },
  priceUsd: { type: Number, default: null },
  fee: { type: Number, default: 0 },
  note: { type: String },

  rowNumber: { type: Number, required: true },
  isValid: { type: Boolean, default: true },
  isDuplicate: { type: Boolean, default: false },
  validationErrors: [{ type: String }]
}, {
  timestamps: true,
  collection: 'exchange_transactions'
});

ExchangeTransactionSchema.index({ runId: 1, asset: 1, type: 1, timestamp: 1 });
ExchangeTransactionSchema.index({ runId: 1, isValid: 1, isDuplicate: 1, timestamp: 1 });

const ExchangeTransaction = mongoose.model<IExchangeTransaction>('ExchangeTransaction', ExchangeTransactionSchema);
export default ExchangeTransaction;
