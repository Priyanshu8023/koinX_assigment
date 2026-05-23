import mongoose, { Schema } from 'mongoose';

export interface IUserTransaction {
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

const UserTransactionSchema = new Schema<IUserTransaction>({
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
  collection: 'user_transactions'
});

UserTransactionSchema.index({ runId: 1, asset: 1, type: 1, timestamp: 1 });
UserTransactionSchema.index({ runId: 1, isValid: 1, isDuplicate: 1, timestamp: 1 });

const UserTransaction = mongoose.model<IUserTransaction>('UserTransaction', UserTransactionSchema);
export default UserTransaction;
