import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accreditations = await prisma.accreditation.findMany({
    take: 5,
    include: {
      project: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });

  console.log('Total accreditations:', await prisma.accreditation.count());
  console.log('\nSample accreditations:');

  accreditations.forEach((acc) => {
    console.log(`\n- ${acc.firstName} ${acc.lastName}`);
    console.log(`  Number: ${acc.accreditationNumber}`);
    console.log(`  QR Token: ${acc.qrCodeToken}`);
    console.log(`  Project: ${acc.project.name}`);
    console.log(`  Status: ${acc.status}`);
    console.log(`  View at: https://portal.becreative.qa/verify/${acc.qrCodeToken}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
