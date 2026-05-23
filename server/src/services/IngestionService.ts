import UserTransaction, { IUserTransaction } from '../models/UserTransaction.js';
import ExchangeTransaction, { IExchangeTransaction } from '../models/ExchangeTransaction.js';
import { parseCSVStream } from '../utils/csvParser.js';
import { validateRow } from '../utils/validator.js';
import { normalizeAsset, normalizeType } from '../utils/normalizer.js';

export interface IngestionStats {
  user: {
    total: number;
    valid: number;
    invalid: number;
    duplicate: number;
  };
  exchange: {
    total: number;
    valid: number;
    invalid: number;
    duplicate: number;
  };
}

export class IngestionService {
  private static BATCH_SIZE = 500;

  public static async ingestFiles(
    runId: string,
    userFilePath: string,
    exchangeFilePath: string
  ): Promise<IngestionStats> {
    
    const userStats = await this.ingestUserTransactions(runId, userFilePath);

    const exchangeStats = await this.ingestExchangeTransactions(runId, exchangeFilePath);

    return {
      user: userStats,
      exchange: exchangeStats
    };
  }

  private static async ingestUserTransactions(
    runId: string,
    filePath: string
  ): Promise<{ total: number; valid: number; invalid: number; duplicate: number }> {
    const buffer: any[] = [];
    const seenKeys = new Set<string>();
    
    let total = 0;
    let valid = 0;
    let invalid = 0;
    let duplicate = 0;

    await parseCSVStream(filePath, async (row, rowNumber) => {
      total++;

      const rawTimestamp = row.timestamp || '';
      const rawQuantity = row.quantity || '';
      const rawPriceUsd = row.price_usd || '';
      const rawFee = row.fee || '';

      let parsedTimestamp: Date | null = null;
      if (rawTimestamp) {
        const date = new Date(rawTimestamp);
        if (!isNaN(date.getTime())) {
          parsedTimestamp = date;
        }
      }
      const normalizedType = normalizeType(row.type || '');
      const normalizedAsset = normalizeAsset(row.asset || '');
      
      const parsedQuantity = (rawQuantity && !isNaN(parseFloat(rawQuantity))) ? parseFloat(rawQuantity) : null;
      const parsedPriceUsd = (rawPriceUsd && !isNaN(parseFloat(rawPriceUsd))) ? parseFloat(rawPriceUsd) : null;
      const parsedFee = (rawFee && !isNaN(parseFloat(rawFee))) ? parseFloat(rawFee) : 0;

      const record = {
        runId,
        transactionId: row.transaction_id || '',
        rawTimestamp,
        rawType: row.type || '',
        rawAsset: row.asset || '',
        rawQuantity,
        rawPriceUsd,
        rawFee,
        rawNote: row.note || '',
        
        timestamp: parsedTimestamp,
        type: normalizedType,
        asset: normalizedAsset,
        quantity: parsedQuantity,
        priceUsd: parsedPriceUsd,
        fee: parsedFee,
        note: row.note || '',
        rowNumber,
        isValid: true,
        isDuplicate: false,
        validationErrors: [] as string[]
      };

      const validationErrors = validateRow(record);
      if (validationErrors.length > 0) {
        record.isValid = false;
        record.validationErrors = validationErrors;
        invalid++;
      }

      if (record.isValid) {
        const dupKey = `${record.transactionId}_${record.timestamp?.toISOString()}`;
        if (seenKeys.has(dupKey)) {
          record.isDuplicate = true;
          duplicate++;
        } else {
          seenKeys.add(dupKey);
          valid++;
        }
      }

      buffer.push(record);

      if (buffer.length >= this.BATCH_SIZE) {
        await UserTransaction.insertMany(buffer);
        buffer.length = 0; 
      }
    });

    if (buffer.length > 0) {
      await UserTransaction.insertMany(buffer);
    }

    return { total, valid, invalid, duplicate };
  }

  private static async ingestExchangeTransactions(
    runId: string,
    filePath: string
  ): Promise<{ total: number; valid: number; invalid: number; duplicate: number }> {
    const buffer: any[] = [];
    const seenKeys = new Set<string>();
    
    let total = 0;
    let valid = 0;
    let invalid = 0;
    let duplicate = 0;

    await parseCSVStream(filePath, async (row, rowNumber) => {
      total++;

      const rawTimestamp = row.timestamp || '';
      const rawQuantity = row.quantity || '';
      const rawPriceUsd = row.price_usd || '';
      const rawFee = row.fee || '';

      let parsedTimestamp: Date | null = null;
      if (rawTimestamp) {
        const date = new Date(rawTimestamp);
        if (!isNaN(date.getTime())) {
          parsedTimestamp = date;
        }
      }
      const normalizedType = normalizeType(row.type || '');
      const normalizedAsset = normalizeAsset(row.asset || '');
      
      const parsedQuantity = (rawQuantity && !isNaN(parseFloat(rawQuantity))) ? parseFloat(rawQuantity) : null;
      const parsedPriceUsd = (rawPriceUsd && !isNaN(parseFloat(rawPriceUsd))) ? parseFloat(rawPriceUsd) : null;
      const parsedFee = (rawFee && !isNaN(parseFloat(rawFee))) ? parseFloat(rawFee) : 0;

      const record = {
        runId,
        transactionId: row.transaction_id || '',
        rawTimestamp,
        rawType: row.type || '',
        rawAsset: row.asset || '',
        rawQuantity,
        rawPriceUsd,
        rawFee,
        rawNote: row.note || '',
        
        timestamp: parsedTimestamp,
        type: normalizedType,
        asset: normalizedAsset,
        quantity: parsedQuantity,
        priceUsd: parsedPriceUsd,
        fee: parsedFee,
        note: row.note || '',
        rowNumber,
        isValid: true,
        isDuplicate: false,
        validationErrors: [] as string[]
      };

      const validationErrors = validateRow(record);
      if (validationErrors.length > 0) {
        record.isValid = false;
        record.validationErrors = validationErrors;
        invalid++;
      }

      if (record.isValid) {
        const dupKey = `${record.transactionId}_${record.timestamp?.toISOString()}`;
        if (seenKeys.has(dupKey)) {
          record.isDuplicate = true;
          duplicate++;
        } else {
          seenKeys.add(dupKey);
          valid++;
        }
      }

      buffer.push(record);

      if (buffer.length >= this.BATCH_SIZE) {
        await ExchangeTransaction.insertMany(buffer);
        buffer.length = 0; 
      }
    });

    if (buffer.length > 0) {
      await ExchangeTransaction.insertMany(buffer);
    }

    return { total, valid, invalid, duplicate };
  }
}
