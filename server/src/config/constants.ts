
export const ASSET_ALIASES: Record<string, string> = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'tether': 'USDT',
  'solana': 'SOL',
  'polygon': 'MATIC'
};

export const TYPE_EQUIVALENCES: Record<string, string> = {
  'BUY': 'BUY',
  'SELL': 'SELL',
  'TRANSFER_OUT': 'TRANSFER_IN',
  'TRANSFER_IN': 'TRANSFER_OUT'
};

export const DEFAULT_TOLERANCES = {
  TIMESTAMP_TOLERANCE_SECONDS: 300,
  QUANTITY_TOLERANCE_PCT: 0.01
};
