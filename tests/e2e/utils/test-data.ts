/**
 * Test data generators for E2E tests
 */

export function generateAssetData() {
  const timestamp = Date.now();
  return {
    model: `TEST Laptop ${timestamp}`,
    type: 'Laptop',
    assetTag: `TEST-${timestamp}`,
    brand: 'Dell',
    serialNumber: `SN${timestamp}`,
    status: 'ACTIVE',
  };
}

export function generateSubscriptionData() {
  const timestamp = Date.now();
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 30); // 30 days from now

  return {
    serviceName: `TEST Subscription ${timestamp}`,
    billingCycle: 'MONTHLY',
    costPerCycle: '100',
    currency: 'QAR',
    renewalDate: renewalDate.toISOString().split('T')[0], // YYYY-MM-DD format
  };
}

export function generateAccreditationProjectData() {
  const timestamp = Date.now();
  const today = new Date();

  const bumpInStart = new Date(today);
  const bumpInEnd = new Date(today);
  bumpInEnd.setDate(bumpInEnd.getDate() + 2);

  const liveStart = new Date(today);
  liveStart.setDate(liveStart.getDate() + 3);

  const liveEnd = new Date(today);
  liveEnd.setDate(liveEnd.getDate() + 5);

  const bumpOutStart = new Date(today);
  bumpOutStart.setDate(bumpOutStart.getDate() + 6);

  const bumpOutEnd = new Date(today);
  bumpOutEnd.setDate(bumpOutEnd.getDate() + 7);

  return {
    name: `TEST Event ${timestamp}`,
    code: `TEST${timestamp}`,
    bumpInStart: bumpInStart.toISOString().split('T')[0],
    bumpInEnd: bumpInEnd.toISOString().split('T')[0],
    liveStart: liveStart.toISOString().split('T')[0],
    liveEnd: liveEnd.toISOString().split('T')[0],
    bumpOutStart: bumpOutStart.toISOString().split('T')[0],
    bumpOutEnd: bumpOutEnd.toISOString().split('T')[0],
    accessGroups: ['VIP', 'Staff', 'Media'],
  };
}

export function generateAccreditationRecordData() {
  const timestamp = Date.now();
  const qidExpiry = new Date();
  qidExpiry.setFullYear(qidExpiry.getFullYear() + 1); // 1 year from now

  return {
    firstName: 'Test',
    lastName: `User ${timestamp}`,
    organization: 'Test Organization',
    jobTitle: 'Tester',
    accessGroup: 'VIP',
    qidNumber: '12345678901',
    qidExpiry: qidExpiry.toISOString().split('T')[0],
    bumpInAccess: true,
    liveAccess: true,
  };
}

export function generateUserData() {
  const timestamp = Date.now();
  return {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    role: 'EMPLOYEE',
  };
}

/**
 * Wait for a specific amount of time
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days from now
 */
export function getDateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}
