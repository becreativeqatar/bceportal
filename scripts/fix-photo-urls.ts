import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPhotoUrls() {
  console.log('Starting photo URL cleanup...');

  // Find all accreditations with profilePhotoUrl that don't start with http
  const accreditations = await prisma.accreditation.findMany({
    where: {
      profilePhotoUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      profilePhotoUrl: true,
    },
  });

  console.log(`Found ${accreditations.length} records with photo URLs`);

  let updated = 0;
  for (const acc of accreditations) {
    if (acc.profilePhotoUrl && !acc.profilePhotoUrl.startsWith('http://') && !acc.profilePhotoUrl.startsWith('https://')) {
      console.log(`Cleaning invalid URL for ${acc.id}: ${acc.profilePhotoUrl}`);
      await prisma.accreditation.update({
        where: { id: acc.id },
        data: { profilePhotoUrl: null },
      });
      updated++;
    }
  }

  console.log(`✓ Cleaned ${updated} invalid photo URLs`);
  console.log('Done! Please re-upload photos for affected records.');
}

fixPhotoUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
