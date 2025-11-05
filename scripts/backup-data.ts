import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backup() {
  try {
    console.log('Starting data backup...');

    // Export Users with all related data
    const users = await prisma.user.findMany({
      include: {
        assets: true,
        subscriptions: true,
      }
    });

    // Export Subscriptions with all history
    const subscriptions = await prisma.subscription.findMany({
      include: {
        history: {
          include: {
            performer: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Export Activity Logs
    const activities = await prisma.activityLog.findMany({
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

    // Save data to JSON files
    fs.writeFileSync(
      path.join(backupDir, `users-${timestamp}.json`),
      JSON.stringify(users, null, 2)
    );
    console.log(`✅ Exported ${users.length} users`);

    fs.writeFileSync(
      path.join(backupDir, `subscriptions-${timestamp}.json`),
      JSON.stringify(subscriptions, null, 2)
    );
    console.log(`✅ Exported ${subscriptions.length} subscriptions`);

    fs.writeFileSync(
      path.join(backupDir, `activities-${timestamp}.json`),
      JSON.stringify(activities, null, 2)
    );
    console.log(`✅ Exported ${activities.length} activity logs`);

    // Create summary
    const summary = {
      timestamp,
      counts: {
        users: users.length,
        subscriptions: subscriptions.length,
        activities: activities.length,
      }
    };

    fs.writeFileSync(
      path.join(backupDir, `backup-summary-${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✅ Backup completed successfully!');
    console.log(`Backup location: ${backupDir}`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backup();
