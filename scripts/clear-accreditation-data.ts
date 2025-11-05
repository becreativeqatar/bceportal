import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAccreditationData() {
  try {
    console.log('🗑️  Starting to delete accreditation data...\n');

    // Delete in order to respect foreign key constraints

    // 1. Delete AccreditationScans
    const scansDeleted = await prisma.accreditationScan.deleteMany({});
    console.log(`✅ Deleted ${scansDeleted.count} accreditation scans`);

    // 2. Delete AccreditationHistory
    const historyDeleted = await prisma.accreditationHistory.deleteMany({});
    console.log(`✅ Deleted ${historyDeleted.count} accreditation history records`);

    // 3. Delete Accreditations
    const accreditationsDeleted = await prisma.accreditation.deleteMany({});
    console.log(`✅ Deleted ${accreditationsDeleted.count} accreditations`);

    // 4. Delete AccreditationProjects
    const projectsDeleted = await prisma.accreditationProject.deleteMany({});
    console.log(`✅ Deleted ${projectsDeleted.count} accreditation projects`);

    console.log('\n✨ All accreditation data has been cleared successfully!');
    console.log('You can now test with fresh data.');
  } catch (error) {
    console.error('❌ Error clearing accreditation data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAccreditationData();
