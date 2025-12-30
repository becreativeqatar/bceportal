import { prisma } from '@/lib/prisma';

/**
 * Generate a unique subscription tag using BCE format
 * Format: BCE-[CAT]-[YY][SEQ]
 * Examples:
 *   - BCE-SW-25001 (1st Software/SaaS subscription in 2025)
 *   - BCE-DG-25003 (3rd Digital Asset subscription in 2025)
 *
 * @param categoryCode - 2-letter category code ('SW' for Software/SaaS, 'DG' for Digital Assets)
 */
export async function generateSubscriptionTag(
  categoryCode: 'SW' | 'DG' = 'SW'
): Promise<string> {
  // Current 2-digit year
  const year = new Date().getFullYear().toString().slice(-2);

  // Build prefix for search: BCE-{CAT}-{YY}
  const prefix = `BCE-${categoryCode}-${year}`;

  // Find the highest sequence number for this category and year
  const existingSubscriptions = await prisma.subscription.findMany({
    where: {
      subscriptionTag: {
        startsWith: prefix
      }
    },
    orderBy: {
      subscriptionTag: 'desc'
    },
    take: 1
  });

  let nextSequence = 1;

  if (existingSubscriptions.length > 0) {
    const latestTag = existingSubscriptions[0].subscriptionTag;
    if (latestTag) {
      // Extract sequence number from tag like "BCE-SW-25001"
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
 * Determine the subscription category based on the subscription type/category
 * - SW: Software & SaaS (default)
 * - DG: Digital Assets (domains, SSL certificates, licenses)
 */
export function getSubscriptionCategoryCode(category?: string | null): 'SW' | 'DG' {
  if (!category) return 'SW';

  const normalizedCategory = category.toLowerCase();

  // Digital Assets patterns
  const digitalAssetPatterns = [
    'domain',
    'ssl',
    'certificate',
    'trademark',
    'patent',
    'copyright',
    'license',
    'digital asset',
  ];

  for (const pattern of digitalAssetPatterns) {
    if (normalizedCategory.includes(pattern)) {
      return 'DG';
    }
  }

  // Default to Software/SaaS
  return 'SW';
}
