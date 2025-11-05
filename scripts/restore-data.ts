import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting data restoration...\n');

  // Find the most recent backup files
  const backupDir = path.join(process.cwd(), 'backups');
  const files = fs.readdirSync(backupDir);

  // Get the latest timestamp from backup files
  const timestamps = files
    .filter(f => f.startsWith('backup-summary-'))
    .map(f => f.replace('backup-summary-', '').replace('.json', ''));

  if (timestamps.length === 0) {
    console.error('❌ No backup files found');
    process.exit(1);
  }

  const latestTimestamp = timestamps.sort().reverse()[0];
  console.log(`📁 Found backup from: ${latestTimestamp}\n`);

  // Read backup files
  const usersFile = path.join(backupDir, `users-${latestTimestamp}.json`);
  const subscriptionsFile = path.join(backupDir, `subscriptions-${latestTimestamp}.json`);
  const activitiesFile = path.join(backupDir, `activities-${latestTimestamp}.json`);

  const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  const subscriptionsData = JSON.parse(fs.readFileSync(subscriptionsFile, 'utf-8'));
  const activitiesData = JSON.parse(fs.readFileSync(activitiesFile, 'utf-8'));

  console.log('📊 Backup contains:');
  console.log(`   - ${usersData.length} users`);
  console.log(`   - ${subscriptionsData.length} subscriptions`);
  console.log(`   - ${activitiesData.length} activity logs\n`);

  // Clear existing data (except system data)
  console.log('🗑️  Clearing existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.subscriptionHistory.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.assetHistory.deleteMany();
  await prisma.asset.deleteMany();
  // Don't delete all users - keep system accounts
  await prisma.user.deleteMany({
    where: {
      isSystemAccount: false
    }
  });
  console.log('✅ Cleared existing data\n');

  // Restore Users
  console.log('👥 Restoring users...');
  for (const user of usersData) {
    try {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSystemAccount: user.isSystemAccount || false,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
      });
      console.log(`   ✓ Restored user: ${user.name || user.email}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`   ⚠ User already exists: ${user.name || user.email}`);
      } else {
        console.error(`   ✗ Failed to restore user ${user.email}:`, error.message);
      }
    }
  }
  console.log(`✅ Restored ${usersData.length} users\n`);

  // Restore Subscriptions
  console.log('💳 Restoring subscriptions...');
  for (const subscription of subscriptionsData) {
    try {
      // Prepare subscription data matching current schema
      const subData: any = {
        id: subscription.id,
        serviceName: subscription.serviceName,
        accountId: subscription.accountId,
        purchaseDate: subscription.purchaseDate ? new Date(subscription.purchaseDate) : null,
        renewalDate: subscription.renewalDate ? new Date(subscription.renewalDate) : null,
        billingCycle: subscription.billingCycle,
        costPerCycle: subscription.costPerCycle ? new Prisma.Decimal(subscription.costPerCycle) : null,
        vendor: subscription.vendor,
        usageType: subscription.usageType,
        autoRenew: subscription.autoRenew,
        paymentMethod: subscription.paymentMethod,
        notes: subscription.notes,
        status: subscription.status || 'ACTIVE',
        assignedUserId: subscription.assignedUserId || null,
        cancelledAt: subscription.cancelledAt ? new Date(subscription.cancelledAt) : null,
        reactivatedAt: subscription.reactivatedAt ? new Date(subscription.reactivatedAt) : null,
        lastActiveRenewalDate: subscription.lastActiveRenewalDate ? new Date(subscription.lastActiveRenewalDate) : null,
        createdAt: new Date(subscription.createdAt),
        updatedAt: new Date(subscription.updatedAt),
      };

      const createdSub = await prisma.subscription.create({
        data: subData,
      });
      console.log(`   ✓ Restored subscription: ${subscription.serviceName}`);

      // Restore subscription history if exists
      if (subscription.history && subscription.history.length > 0) {
        for (const history of subscription.history) {
          try {
            await prisma.subscriptionHistory.create({
              data: {
                id: history.id,
                subscriptionId: createdSub.id,
                action: history.action,
                performedBy: history.performedBy || history.performedById,
                oldRenewalDate: history.oldRenewalDate ? new Date(history.oldRenewalDate) : null,
                newRenewalDate: history.newRenewalDate ? new Date(history.newRenewalDate) : null,
                notes: history.reason || history.notes,
                createdAt: new Date(history.createdAt),
              },
            });
          } catch (error: any) {
            console.error(`     ⚠ Failed to restore history for ${subscription.serviceName}:`, error.message);
          }
        }
        console.log(`     ✓ Restored ${subscription.history.length} history records`);
      }
    } catch (error: any) {
      console.error(`   ✗ Failed to restore subscription ${subscription.serviceName}:`, error.message);
    }
  }
  console.log(`✅ Restored ${subscriptionsData.length} subscriptions\n`);

  // Restore Activity Logs
  console.log('📝 Restoring activity logs...');
  let activityCount = 0;
  for (const activity of activitiesData) {
    try {
      await prisma.activityLog.create({
        data: {
          id: activity.id,
          actorUserId: activity.actorUserId,
          action: activity.action,
          entityType: activity.entityType,
          entityId: activity.entityId,
          payload: activity.payload,
          at: new Date(activity.createdAt || activity.at),
        },
      });
      activityCount++;
    } catch (error: any) {
      // Silently skip activity logs that fail (e.g., if referenced entities don't exist)
    }
  }
  console.log(`✅ Restored ${activityCount} activity logs\n`);

  console.log('🎉 Data restoration completed successfully!');
  console.log('\nSummary:');
  console.log(`   ✓ ${usersData.length} users`);
  console.log(`   ✓ ${subscriptionsData.length} subscriptions`);
  console.log(`   ✓ ${activityCount} activity logs`);
}

main()
  .catch((e) => {
    console.error('❌ Restoration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
