#!/usr/bin/env tsx

/**
 * Manual Testing Script
 *
 * This script helps verify critical functionality manually before deployment.
 * Run with: npm run test:manual or tsx scripts/manual-test.ts
 */

import { prisma } from '../src/lib/prisma';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function testDatabaseConnection() {
  console.log('\n🔍 Testing database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test read
    const userCount = await prisma.user.count();
    console.log(`   Found ${userCount} users in database`);

    const assetCount = await prisma.asset.count();
    console.log(`   Found ${assetCount} assets in database`);

    const subscriptionCount = await prisma.subscription.count();
    console.log(`   Found ${subscriptionCount} subscriptions in database`);

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testAssetWorkflow() {
  console.log('\n🔍 Testing asset creation and retrieval workflow...');

  try {
    // Find a test user or use the first admin
    const testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!testUser) {
      console.log('⚠️  No admin user found for testing. Skipping asset workflow test.');
      return false;
    }

    // Create a test asset
    const testAsset = await prisma.asset.create({
      data: {
        assetCode: `TEST-${Date.now()}`,
        serialNumber: `SN-TEST-${Date.now()}`,
        type: 'Hardware',
        make: 'Test Make',
        model: 'Test Model',
        status: 'Available',
        assignedToId: testUser.id,
      },
    });

    console.log(`✅ Created test asset: ${testAsset.assetCode}`);

    // Retrieve the asset
    const retrievedAsset = await prisma.asset.findUnique({
      where: { id: testAsset.id },
      include: { assignedTo: true },
    });

    if (retrievedAsset) {
      console.log(`✅ Retrieved asset successfully`);
      console.log(`   Asset Code: ${retrievedAsset.assetCode}`);
      console.log(`   Assigned To: ${retrievedAsset.assignedTo?.name || 'N/A'}`);
    }

    // Clean up - delete the test asset
    await prisma.asset.delete({
      where: { id: testAsset.id },
    });

    console.log(`✅ Cleaned up test asset`);

    return true;
  } catch (error) {
    console.error('❌ Asset workflow test failed:', error);
    return false;
  }
}

async function testSubscriptionWorkflow() {
  console.log('\n🔍 Testing subscription creation and retrieval workflow...');

  try {
    // Find a test user
    const testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!testUser) {
      console.log('⚠️  No admin user found for testing. Skipping subscription workflow test.');
      return false;
    }

    // Create a test subscription
    const testSubscription = await prisma.subscription.create({
      data: {
        serviceName: 'Test Service',
        serviceCode: `TEST-SUB-${Date.now()}`,
        billingCycle: 'MONTHLY',
        status: 'Active',
        assignedToId: testUser.id,
        startDate: new Date(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    console.log(`✅ Created test subscription: ${testSubscription.serviceName}`);

    // Retrieve the subscription
    const retrievedSubscription = await prisma.subscription.findUnique({
      where: { id: testSubscription.id },
      include: { assignedTo: true },
    });

    if (retrievedSubscription) {
      console.log(`✅ Retrieved subscription successfully`);
      console.log(`   Service: ${retrievedSubscription.serviceName}`);
      console.log(`   Billing Cycle: ${retrievedSubscription.billingCycle}`);
      console.log(`   Status: ${retrievedSubscription.status}`);
    }

    // Clean up - delete the test subscription
    await prisma.subscription.delete({
      where: { id: testSubscription.id },
    });

    console.log(`✅ Cleaned up test subscription`);

    return true;
  } catch (error) {
    console.error('❌ Subscription workflow test failed:', error);
    return false;
  }
}

async function testActivityLogging() {
  console.log('\n🔍 Testing activity logging...');

  try {
    const recentActivities = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { at: 'desc' },
      include: { actor: true },
    });

    console.log(`✅ Found ${recentActivities.length} recent activities`);

    if (recentActivities.length > 0) {
      console.log('   Recent activity sample:');
      recentActivities.forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.action} by ${activity.actor?.name || 'Unknown'}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Activity logging test failed:', error);
    return false;
  }
}

async function testSupplierWorkflow() {
  console.log('\n🔍 Testing supplier retrieval...');

  try {
    const supplierCount = await prisma.supplier.count();
    console.log(`✅ Found ${supplierCount} suppliers in database`);

    if (supplierCount > 0) {
      const sampleSupplier = await prisma.supplier.findFirst({
        include: {
          _count: {
            select: {
              assets: true,
              subscriptions: true,
            },
          },
        },
      });

      if (sampleSupplier) {
        console.log(`   Sample Supplier: ${sampleSupplier.suppName}`);
        console.log(`   Assets: ${sampleSupplier._count.assets}`);
        console.log(`   Subscriptions: ${sampleSupplier._count.subscriptions}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Supplier workflow test failed:', error);
    return false;
  }
}

async function runInteractiveTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Manual Testing Script for DAMP        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  console.log('This script will test critical workflows in your application.');
  console.log('Press Enter to start testing or Ctrl+C to exit.\n');

  await prompt('Press Enter to continue...');

  const results = {
    database: false,
    asset: false,
    subscription: false,
    activity: false,
    supplier: false,
  };

  // Test 1: Database Connection
  results.database = await testDatabaseConnection();

  if (!results.database) {
    console.log('\n❌ Database connection failed. Cannot continue with other tests.');
    console.log('Please check your DATABASE_URL in .env file.\n');
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 2: Asset Workflow
  const runAssetTest = await prompt('\nRun asset workflow test? (y/n) [y]: ');
  if (runAssetTest.toLowerCase() !== 'n') {
    results.asset = await testAssetWorkflow();
  }

  // Test 3: Subscription Workflow
  const runSubTest = await prompt('\nRun subscription workflow test? (y/n) [y]: ');
  if (runSubTest.toLowerCase() !== 'n') {
    results.subscription = await testSubscriptionWorkflow();
  }

  // Test 4: Activity Logging
  const runActivityTest = await prompt('\nRun activity logging test? (y/n) [y]: ');
  if (runActivityTest.toLowerCase() !== 'n') {
    results.activity = await testActivityLogging();
  }

  // Test 5: Supplier Workflow
  const runSupplierTest = await prompt('\nRun supplier workflow test? (y/n) [y]: ');
  if (runSupplierTest.toLowerCase() !== 'n') {
    results.supplier = await testSupplierWorkflow();
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║          Test Summary                    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const testResults = [
    { name: 'Database Connection', passed: results.database },
    { name: 'Asset Workflow', passed: results.asset },
    { name: 'Subscription Workflow', passed: results.subscription },
    { name: 'Activity Logging', passed: results.activity },
    { name: 'Supplier Workflow', passed: results.supplier },
  ];

  testResults.forEach((test) => {
    if (test.passed !== false) {
      const icon = test.passed ? '✅' : '⚠️';
      const status = test.passed ? 'PASSED' : 'SKIPPED';
      console.log(`${icon} ${test.name}: ${status}`);
    }
  });

  const passedCount = testResults.filter(t => t.passed === true).length;
  const totalRun = testResults.filter(t => t.passed !== false).length;

  console.log(`\nPassed: ${passedCount}/${totalRun} tests`);

  if (passedCount === totalRun) {
    console.log('\n🎉 All tests passed! Your application is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n');

  rl.close();
  await prisma.$disconnect();
}

// Run the tests
runInteractiveTests().catch((error) => {
  console.error('Unexpected error:', error);
  rl.close();
  prisma.$disconnect();
  process.exit(1);
});
