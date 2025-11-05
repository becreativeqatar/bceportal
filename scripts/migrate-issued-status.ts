import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateIssuedStatus() {
  console.log('Starting migration of ISSUED status to APPROVED...');

  try {
    // Use raw SQL to update records since ISSUED is not in the enum anymore
    const result = await prisma.$executeRaw`
      UPDATE "Accreditation"
      SET status = 'APPROVED'::"AccreditationStatus"
      WHERE status = 'ISSUED'::"AccreditationStatus"
    `;

    console.log(`✅ Successfully migrated ${result} records from ISSUED to APPROVED`);

    // Also update history records if any
    const historyResult = await prisma.$executeRaw`
      UPDATE "AccreditationHistory"
      SET "oldStatus" = 'APPROVED'::"AccreditationStatus"
      WHERE "oldStatus" = 'ISSUED'::"AccreditationStatus"
    `;

    console.log(`✅ Updated ${historyResult} history records (oldStatus)`);

    const historyResult2 = await prisma.$executeRaw`
      UPDATE "AccreditationHistory"
      SET "newStatus" = 'APPROVED'::"AccreditationStatus"
      WHERE "newStatus" = 'ISSUED'::"AccreditationStatus"
    `;

    console.log(`✅ Updated ${historyResult2} history records (newStatus)`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateIssuedStatus()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
