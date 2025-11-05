import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function regenerateQRTokens() {
  console.log('🔄 Regenerating QR code tokens for all approved accreditations...');

  // Find all approved accreditations
  const approved = await prisma.accreditation.findMany({
    where: {
      status: 'APPROVED',
      qrCodeToken: { not: null },
    },
    select: {
      id: true,
      accreditationNumber: true,
      firstName: true,
      lastName: true,
      qrCodeToken: true,
    },
  });

  console.log(`Found ${approved.length} approved accreditations with QR codes`);

  let updated = 0;

  for (const acc of approved) {
    // Generate new QR code token
    const newToken = randomBytes(16).toString('hex');

    await prisma.accreditation.update({
      where: { id: acc.id },
      data: { qrCodeToken: newToken },
    });

    console.log(`✓ Updated ${acc.accreditationNumber} - ${acc.firstName} ${acc.lastName}`);
    updated++;
  }

  console.log(`\n✅ Successfully regenerated ${updated} QR code tokens`);
  console.log(`\nNew QR codes will use: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`);
  console.log('\n⚠️  Note: Users need to download new QR code images from the system');
}

regenerateQRTokens()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
