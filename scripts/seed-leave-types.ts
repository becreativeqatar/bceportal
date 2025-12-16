/**
 * Seed Leave Types Script
 *
 * This script seeds the default leave types into the database.
 * It can be run on existing deployments without affecting other data.
 *
 * Usage: npx tsx scripts/seed-leave-types.ts
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_LEAVE_TYPES } from '../src/lib/leave-utils';

const prisma = new PrismaClient();

async function seedLeaveTypes() {
  console.log('🌱 Seeding leave types...\n');

  let created = 0;
  let skipped = 0;

  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    const existing = await prisma.leaveType.findUnique({
      where: { name: leaveType.name },
    });

    if (existing) {
      console.log(`⏭️  Skipped "${leaveType.name}" (already exists)`);
      skipped++;
    } else {
      await prisma.leaveType.create({
        data: leaveType,
      });
      console.log(`✅ Created "${leaveType.name}"`);
      created++;
    }
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
}

async function initializeBalancesForAllUsers() {
  console.log('\n📊 Initializing leave balances for all users...\n');

  const users = await prisma.user.findMany({
    where: { isSystemAccount: false },
  });

  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  const currentYear = new Date().getFullYear();
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    for (const leaveType of leaveTypes) {
      const existing = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
          },
        },
      });

      if (!existing) {
        await prisma.leaveBalance.create({
          data: {
            userId: user.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
            entitlement: leaveType.defaultDays,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`✅ Created ${created} balances, skipped ${skipped} existing`);
}

async function main() {
  try {
    await seedLeaveTypes();

    // Ask if we should initialize balances
    const args = process.argv.slice(2);
    if (args.includes('--with-balances')) {
      await initializeBalancesForAllUsers();
    } else {
      console.log('\n💡 Tip: Run with --with-balances to also initialize balances for all users');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
