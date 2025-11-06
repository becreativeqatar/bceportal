/**
 * Basic Functionality Test Script
 * Run this to quickly verify core features are working
 *
 * Usage: npx tsx scripts/test-basic-functionality.ts
 */

import { prisma } from '../src/lib/prisma';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, message: '✓ Passed', duration });
    console.log(`✓ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push({ name, passed: false, message: `✗ Failed: ${message}`, duration });
    console.log(`✗ ${name} - ${message} (${duration}ms)`);
  }
}

async function main() {
  console.log('🧪 Running Basic Functionality Tests...\n');
  console.log('=' .repeat(60));

  // Test 1: Database Connection
  await runTest('Database Connection', async () => {
    await prisma.$connect();
    await prisma.user.count();
  });

  // Test 2: User Table Operations
  await runTest('User Table Read', async () => {
    const users = await prisma.user.findMany({ take: 5 });
    if (users.length === 0) {
      throw new Error('No users found in database');
    }
  });

  // Test 3: Asset Table Operations
  await runTest('Asset Table Read', async () => {
    const assets = await prisma.asset.findMany({ take: 5 });
    // Assets might be empty in new setup
  });

  // Test 4: Subscription Table Operations
  await runTest('Subscription Table Read', async () => {
    const subscriptions = await prisma.subscription.findMany({ take: 5 });
    // Subscriptions might be empty
  });

  // Test 5: Accreditation Project Table
  await runTest('Accreditation Project Table Read', async () => {
    const projects = await prisma.accreditationProject.findMany({ take: 5 });
    // Might be empty
  });

  // Test 6: Supplier Table
  await runTest('Supplier Table Read', async () => {
    const suppliers = await prisma.supplier.findMany({ take: 5 });
    // Might be empty
  });

  // Test 7: Activity Log
  await runTest('Activity Log Read', async () => {
    const logs = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { at: 'desc' }
    });
    // Might be empty
  });

  // Test 8: Create and Delete Test Asset
  await runTest('Create Test Asset', async () => {
    const testAsset = await prisma.asset.create({
      data: {
        model: 'TEST-DELETE-ME',
        type: 'TEST',
        assetTag: `TEST-${Date.now()}`,
      }
    });

    // Immediately delete it
    await prisma.asset.delete({
      where: { id: testAsset.id }
    });
  });

  // Test 9: Relationships Work
  await runTest('User with Assets Relationship', async () => {
    const userWithAssets = await prisma.user.findFirst({
      include: {
        assets: true,
        subscriptions: true,
      }
    });
    if (!userWithAssets) {
      throw new Error('No users found');
    }
  });

  // Test 10: Complex Query
  await runTest('Complex Asset Query', async () => {
    const assets = await prisma.asset.findMany({
      where: {
        status: 'IN_USE',
      },
      include: {
        assignedUser: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      take: 5
    });
    // Might return empty array, which is fine
  });

  // Test 11: Date Queries
  await runTest('Date-based Queries', async () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingRenewals = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        renewalDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        }
      },
      take: 5
    });
    // Might be empty
  });

  // Test 12: Aggregation Queries
  await runTest('Aggregation Queries', async () => {
    const assetCount = await prisma.asset.count();
    const subscriptionCount = await prisma.subscription.count();
    const userCount = await prisma.user.count();

    console.log(`   → Assets: ${assetCount}, Subscriptions: ${subscriptionCount}, Users: ${userCount}`);
  });

  // Test 13: Accreditation with Relations
  await runTest('Accreditation Relations', async () => {
    const accreditations = await prisma.accreditation.findMany({
      include: {
        project: true,
        createdBy: {
          select: { name: true, email: true }
        }
      },
      take: 5
    });
    // Might be empty
  });

  // Test 14: Supplier with Engagements
  await runTest('Supplier Relations', async () => {
    const suppliers = await prisma.supplier.findMany({
      include: {
        engagements: true,
        approvedBy: {
          select: { name: true }
        }
      },
      take: 5
    });
    // Might be empty
  });

  // Test 15: Search Functionality
  await runTest('Text Search', async () => {
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { type: { contains: 'Laptop', mode: 'insensitive' } },
          { brand: { contains: 'Dell', mode: 'insensitive' } },
        ]
      },
      take: 5
    });
    // Might be empty
  });

  // Disconnect
  await prisma.$disconnect();

  // Print Summary
  console.log('=' .repeat(60));
  console.log('\n📊 Test Summary:\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    console.log('\n💡 Next Steps:');
    console.log('  1. Review TESTING_CHECKLIST.md');
    console.log('  2. Fix any ESLint errors: npm run lint');
    console.log('  3. Test manually as different user roles');
    console.log('  4. Run build: npm run build');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
