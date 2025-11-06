import { PrismaClient, AccreditationStatus } from '@prisma/client';

const prisma = new PrismaClient();

const firstNames = [
  'Mohammed', 'Fatima', 'Ahmed', 'Aisha', 'Ali', 'Noor', 'Omar', 'Layla', 'Hassan', 'Zainab',
  'Khalid', 'Mariam', 'Abdullah', 'Sara', 'Ibrahim', 'Hana', 'Yousef', 'Amina', 'Hamza', 'Leila',
  'Rashid', 'Dina', 'Tariq', 'Jana', 'Saeed', 'Rana', 'Faisal', 'Reem', 'Mansour', 'Lina',
  'Majid', 'Yasmin', 'Nasser', 'Nada', 'Sultan', 'Salma', 'Waleed', 'Huda', 'Sami', 'Rania',
  'Karim', 'Maya', 'Adel', 'Mona', 'Jamal', 'Noura', 'Fahad', 'Hala', 'Rami', 'Aya'
];

const lastNames = [
  'Al-Mansoori', 'Al-Kuwari', 'Al-Thani', 'Al-Marri', 'Al-Mohannadi', 'Al-Nasr', 'Al-Malki',
  'Al-Sulaiti', 'Al-Emadi', 'Al-Ansari', 'Al-Khater', 'Al-Jaber', 'Al-Obaidli', 'Al-Dosari',
  'Al-Ghani', 'Al-Majid', 'Al-Saadi', 'Al-Hamad', 'Al-Kaabi', 'Al-Muftah', 'Al-Fadhala',
  'Al-Hajri', 'Al-Attiyah', 'Al-Romaihi', 'Al-Sulaiman', 'Al-Boinin', 'Al-Khawaja',
  'Al-Binali', 'Al-Kuwari', 'Al-Meer'
];

const organizations = [
  'Qatar Foundation', 'Supreme Committee', 'Qatar Airways', 'Ooredoo',
  'Qatar Petroleum', 'Hamad Medical Corporation', 'Aspire Academy', 'Msheireb Properties',
  'Qatar Museums', 'Education City', 'Katara Cultural Village', 'Qatar National Library',
  'Be Creative Agency', 'Qatar Media Corporation', 'Al Jazeera Network', 'Weill Cornell Medicine'
];

const jobTitles = [
  'Project Manager', 'Operations Coordinator', 'Event Supervisor', 'Media Coordinator',
  'Technical Director', 'Logistics Manager', 'Security Officer', 'Medical Staff',
  'VIP Coordinator', 'Broadcast Engineer', 'Marketing Specialist', 'IT Support',
  'Venue Manager', 'Protocol Officer', 'Catering Manager', 'Transportation Coordinator'
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQID(): string {
  return `2${randomInt(1000000000, 9999999999)}`;
}

function generatePassport(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return letters[randomInt(0, letters.length - 1)] +
         letters[randomInt(0, letters.length - 1)] +
         randomInt(100000, 999999).toString();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function randomBytes(length: number = 16): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length * 2; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

async function main() {
  console.log('🗑️  Deleting all existing accreditation records...');

  // Delete in correct order to respect foreign keys
  await prisma.accreditationScan.deleteMany({});
  await prisma.accreditationHistory.deleteMany({});
  await prisma.accreditation.deleteMany({});

  console.log('✅ All accreditation records deleted');

  // Get the first active accreditation project
  const project = await prisma.accreditationProject.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!project) {
    console.error('❌ No active accreditation project found. Please create one first.');
    return;
  }

  console.log(`📋 Using project: ${project.name} (${project.code})`);

  // Get first admin user for creator/approver
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!admin) {
    console.error('❌ No admin user found. Please create an admin user first.');
    return;
  }

  const accessGroups = project.accessGroups as string[];
  const statuses = ['DRAFT', 'PENDING', 'APPROVED'];
  const now = new Date();

  console.log(`🎯 Creating dummy accreditation records...`);

  const recordsToCreate = 50; // Create 50 dummy records
  let created = 0;

  for (let i = 0; i < recordsToCreate; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const organization = randomElement(organizations);
    const jobTitle = randomElement(jobTitles);
    const accessGroup = randomElement(accessGroups);
    const status = randomElement(statuses);
    const useQID = Math.random() > 0.3; // 70% use QID, 30% use Passport

    // Generate identification
    const qidNumber = useQID ? generateQID() : null;
    const qidExpiry = useQID ? addMonths(now, randomInt(12, 36)) : null;
    const passportNumber = !useQID ? generatePassport() : null;
    const passportCountry = !useQID ? (Math.random() > 0.5 ? 'QA' : randomElement(['SA', 'AE', 'OM', 'KW', 'BH'])) : null;
    const passportExpiry = !useQID ? addMonths(now, randomInt(12, 60)) : null;
    const hayyaVisaNumber = !useQID ? `HV${randomInt(100000, 999999)}` : null;
    const hayyaVisaExpiry = !useQID ? addDays(new Date(project.bumpOutEnd), randomInt(1, 30)) : null;

    // Random phase access
    const hasBumpInAccess = Math.random() > 0.3;
    const hasLiveAccess = Math.random() > 0.2;
    const hasBumpOutAccess = Math.random() > 0.4;

    // Generate QR code token if approved
    const qrCodeToken = status === 'APPROVED' ? randomBytes(16) : null;
    const approvedById = status === 'APPROVED' ? admin.id : null;
    const approvedAt = status === 'APPROVED' ? addDays(now, -randomInt(1, 30)) : null;

    try {
      const accreditation = await prisma.accreditation.create({
        data: {
          accreditationNumber: `ACC-${String(i + 1).padStart(4, '0')}`,
          firstName,
          lastName,
          organization,
          jobTitle,
          accessGroup,
          profilePhotoUrl: null,
          qidNumber,
          qidExpiry,
          passportNumber,
          passportCountry,
          passportExpiry,
          hayyaVisaNumber,
          hayyaVisaExpiry,
          hasBumpInAccess,
          bumpInStart: hasBumpInAccess ? new Date(project.bumpInStart) : null,
          bumpInEnd: hasBumpInAccess ? new Date(project.bumpInEnd) : null,
          hasLiveAccess,
          liveStart: hasLiveAccess ? new Date(project.liveStart) : null,
          liveEnd: hasLiveAccess ? new Date(project.liveEnd) : null,
          hasBumpOutAccess,
          bumpOutStart: hasBumpOutAccess ? new Date(project.bumpOutStart) : null,
          bumpOutEnd: hasBumpOutAccess ? new Date(project.bumpOutEnd) : null,
          status: status as AccreditationStatus,
          qrCodeToken,
          approvedById,
          approvedAt,
          projectId: project.id,
          createdById: admin.id,
        },
      });

      // Create history record
      await prisma.accreditationHistory.create({
        data: {
          accreditationId: accreditation.id,
          action: 'CREATED',
          newStatus: status as AccreditationStatus,
          performedById: admin.id,
        },
      });

      // If approved, add approval history
      if (status === 'APPROVED') {
        await prisma.accreditationHistory.create({
          data: {
            accreditationId: accreditation.id,
            action: 'APPROVED',
            oldStatus: AccreditationStatus.PENDING,
            newStatus: AccreditationStatus.APPROVED,
            performedById: admin.id,
          },
        });
      }

      // If approved, create some random badge scans
      if (status === 'APPROVED' && Math.random() > 0.5) {
        const scanCount = randomInt(1, 5);
        for (let j = 0; j < scanCount; j++) {
          await prisma.accreditationScan.create({
            data: {
              accreditationId: accreditation.id,
              scannedAt: addDays(now, -randomInt(0, 7)),
              scannedById: admin.id,
              location: randomElement(['Main Gate', 'VIP Entrance', 'Backstage', 'Media Center', 'Control Room']),
              wasValid: true,
            },
          });
        }
      }

      created++;
      if (created % 10 === 0) {
        console.log(`✨ Created ${created}/${recordsToCreate} records...`);
      }
    } catch (error) {
      console.error(`❌ Error creating record ${i + 1}:`, error);
    }
  }

  console.log(`\n✅ Successfully created ${created} dummy accreditation records!`);
  console.log(`\n📊 Summary:`);
  const draftCount = await prisma.accreditation.count({ where: { status: 'DRAFT' } });
  const pendingCount = await prisma.accreditation.count({ where: { status: 'PENDING' } });
  const approvedCount = await prisma.accreditation.count({ where: { status: 'APPROVED' } });
  const scanCount = await prisma.accreditationScan.count();

  console.log(`   - Draft: ${draftCount}`);
  console.log(`   - Pending: ${pendingCount}`);
  console.log(`   - Approved: ${approvedCount}`);
  console.log(`   - Total Scans: ${scanCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
