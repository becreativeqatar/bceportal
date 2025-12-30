import { prisma } from '@/lib/prisma';
import { isValidCategoryCode, type AssetCategoryCode } from './asset-categories';

/**
 * Generate a unique asset tag using BCE format
 * Format: BCE-[CAT]-[YY][SEQ]
 * Examples:
 *   - BCE-CP-25001 (1st Computing asset in 2025)
 *   - BCE-CP-00003 (3rd Transferred Computing asset, year=00)
 *
 * @param categoryCode - 2-letter category code (e.g., 'CP', 'MO', 'DP')
 * @param isTransferred - If true, uses '00' for year to indicate transferred asset
 */
export async function generateAssetTag(
  categoryCode: string,
  isTransferred: boolean = false
): Promise<string> {
  // Validate category code
  if (!isValidCategoryCode(categoryCode)) {
    throw new Error(`Invalid category code: ${categoryCode}`);
  }

  // Year: use '00' for transferred assets, otherwise current 2-digit year
  const year = isTransferred ? '00' : new Date().getFullYear().toString().slice(-2);

  // Build prefix for search: BCE-{CAT}-{YY}
  const prefix = `BCE-${categoryCode}-${year}`;

  // Find the highest sequence number for this category and year
  const existingAssets = await prisma.asset.findMany({
    where: {
      assetTag: {
        startsWith: prefix
      }
    },
    orderBy: {
      assetTag: 'desc'
    },
    take: 1
  });

  let nextSequence = 1;

  if (existingAssets.length > 0) {
    const latestTag = existingAssets[0].assetTag;
    if (latestTag) {
      // Extract sequence number from tag like "BCE-CP-25001"
      // The sequence is the last 3 digits after the year
      const match = latestTag.match(/BCE-[A-Z]{2}-(\d{2})(\d{3})$/);
      if (match) {
        const currentSequence = parseInt(match[2], 10);
        if (!isNaN(currentSequence)) {
          nextSequence = currentSequence + 1;
        }
      }
    }
  }

  // Format sequence with leading zeros (3 digits)
  const sequence = nextSequence.toString().padStart(3, '0');

  return `${prefix}${sequence}`;
}

/**
 * Legacy function - Generate asset tag based on asset type (old format)
 * Format: {TYPE_PREFIX}-{YEAR}-{SEQUENCE}
 * @deprecated Use generateAssetTag with category code instead
 */
export async function generateAssetTagLegacy(assetType: string): Promise<string> {
  const year = new Date().getFullYear();

  // Create prefix from asset type (first 3 characters, uppercase)
  const prefix = assetType.toUpperCase().substring(0, 3);

  // Find the highest sequence number for this year and type
  const existingAssets = await prisma.asset.findMany({
    where: {
      assetTag: {
        startsWith: `${prefix}-${year}-`
      }
    },
    orderBy: {
      assetTag: 'desc'
    },
    take: 1
  });

  let nextSequence = 1;

  if (existingAssets.length > 0) {
    const latestTag = existingAssets[0].assetTag;
    if (latestTag) {
      // Extract sequence number from tag like "LAP-2024-001"
      const parts = latestTag.split('-');
      if (parts.length === 3) {
        const currentSequence = parseInt(parts[2], 10);
        if (!isNaN(currentSequence)) {
          nextSequence = currentSequence + 1;
        }
      }
    }
  }

  // Format sequence with leading zeros (3 digits)
  const sequence = nextSequence.toString().padStart(3, '0');

  return `${prefix}-${year}-${sequence}`;
}

/**
 * Generate asset tag suggestions based on common asset types
 */
export function getAssetTypePrefix(assetType: string): string {
  const type = assetType.toLowerCase();
  
  // Common prefixes for asset types
  const prefixMap: Record<string, string> = {
    'laptop': 'LAP',
    'desktop': 'DSK', 
    'monitor': 'MON',
    'phone': 'PHN',
    'tablet': 'TAB',
    'printer': 'PRT',
    'camera': 'CAM',
    'headset': 'HDS',
    'keyboard': 'KBD',
    'mouse': 'MSE',
    'server': 'SRV',
    'router': 'RTR',
    'switch': 'SWT',
    'projector': 'PRJ',
    'scanner': 'SCN'
  };
  
  // Try to find a match
  for (const [key, prefix] of Object.entries(prefixMap)) {
    if (type.includes(key)) {
      return prefix;
    }
  }
  
  // Default: first 3 characters of type
  return assetType.toUpperCase().substring(0, 3);
}