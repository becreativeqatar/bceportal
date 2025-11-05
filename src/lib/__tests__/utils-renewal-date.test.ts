import { calculateNextRenewal } from '../utils/renewal-date';
import { BillingCycle } from '@prisma/client';

describe('Renewal Date Utilities', () => {
  describe('calculateNextRenewal', () => {
    const testDate = new Date('2024-01-15');

    it('should calculate monthly renewal correctly', () => {
      const nextRenewal = calculateNextRenewal(testDate, BillingCycle.MONTHLY);
      expect(nextRenewal.getMonth()).toBe(1); // February
      expect(nextRenewal.getDate()).toBe(15);
    });

    it('should calculate yearly renewal correctly', () => {
      const nextRenewal = calculateNextRenewal(testDate, BillingCycle.YEARLY);
      expect(nextRenewal.getFullYear()).toBe(2025);
      expect(nextRenewal.getMonth()).toBe(0); // January
      expect(nextRenewal.getDate()).toBe(15);
    });

    it('should handle ONE_TIME billing cycle', () => {
      const nextRenewal = calculateNextRenewal(testDate, BillingCycle.ONE_TIME);
      // ONE_TIME should return the same date or null
      expect(nextRenewal).toBeDefined();
    });

    it('should handle end-of-month dates', () => {
      const endOfMonth = new Date('2024-01-31');
      const nextRenewal = calculateNextRenewal(endOfMonth, BillingCycle.MONTHLY);
      // Should handle February correctly (28/29 days)
      expect(nextRenewal.getMonth()).toBe(1); // February
    });

    it('should handle leap years', () => {
      const leapYearDate = new Date('2024-02-29'); // 2024 is a leap year
      const nextRenewal = calculateNextRenewal(leapYearDate, BillingCycle.YEARLY);
      expect(nextRenewal.getFullYear()).toBe(2025);
    });
  });
});
