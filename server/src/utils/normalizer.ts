import { ASSET_ALIASES } from '../config/constants.js';


export function normalizeAsset(asset: string): string {
  if (!asset) return '';
  const trimmed = asset.trim().toLowerCase();
  
  if (ASSET_ALIASES[trimmed]) {
    return ASSET_ALIASES[trimmed];
  }
  
  return asset.trim().toUpperCase();
}


export function normalizeType(type: string): string {
  if (!type) return '';
  return type.trim().toUpperCase();
}
