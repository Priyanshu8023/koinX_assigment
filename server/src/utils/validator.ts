/**
 * Validates a normalized transaction record.
 * Returns an array of error messages, or an empty array if valid.
 */
export function validateRow(row: {
  transactionId: string;
  type: string;
  asset: string;
  quantity: number | null;
  priceUsd: number | null;
  fee: number;
  timestamp: Date | null;
  rawTimestamp: string;
  rawQuantity: string;
  rawPriceUsd: string;
  rawFee: string;
}): string[] {
  const errors: string[] = [];
  if (!row.transactionId || row.transactionId.trim() === '') {
    errors.push('Missing transaction ID');
  }

  if (!row.rawTimestamp || row.rawTimestamp.trim() === '') {
    errors.push('Missing timestamp');
  } else if (!row.timestamp || isNaN(row.timestamp.getTime())) {
    errors.push('Malformed or invalid timestamp');
  }

  const allowedTypes = ['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT'];
  if (!row.type || row.type.trim() === '') {
    errors.push('Missing transaction type');
  } else if (!allowedTypes.includes(row.type)) {
    errors.push(`Invalid transaction type: '${row.type}' (expected: ${allowedTypes.join(', ')})`);
  }

  if (!row.asset || row.asset.trim() === '') {
    errors.push('Missing asset ticker');
  }

  if (!row.rawQuantity || row.rawQuantity.trim() === '') {
    errors.push('Missing quantity');
  } else if (row.quantity === null || isNaN(row.quantity)) {
    errors.push('Malformed quantity (not a number)');
  } else if (row.quantity <= 0) {
    errors.push(`Quantity must be greater than zero (received: ${row.quantity})`);
  }

  if (row.type === 'BUY' || row.type === 'SELL') {
    if (!row.rawPriceUsd || row.rawPriceUsd.trim() === '') {
      errors.push(`Missing price_usd for transaction type '${row.type}'`);
    } else if (row.priceUsd === null || isNaN(row.priceUsd)) {
      errors.push('Malformed price_usd (not a number)');
    } else if (row.priceUsd <= 0) {
      errors.push(`price_usd must be greater than zero for '${row.type}' (received: ${row.priceUsd})`);
    }
  }


  if (row.rawFee && row.rawFee.trim() !== '') {
    if (row.fee === null || isNaN(row.fee)) {
      errors.push('Malformed fee (not a number)');
    } else if (row.fee < 0) {
      errors.push(`Fee cannot be negative (received: ${row.fee})`);
    }
  }

  return errors;
}
