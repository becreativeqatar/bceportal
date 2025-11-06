import { PrismaClient, AssetStatus, AcquisitionType } from '@prisma/client';

const prisma = new PrismaClient();

const assetTypes = [
  'Laptop', 'Desktop', 'Monitor', 'Keyboard', 'Mouse', 'Tablet', 'Phone', 'Printer',
  'Scanner', 'Projector', 'Camera', 'Headset', 'Webcam', 'Router', 'Switch',
  'Server', 'Hard Drive', 'SSD', 'RAM', 'GPU', 'Dock', 'Cable', 'Charger'
];

const brands = [
  'Apple', 'Dell', 'HP', 'Lenovo', 'Microsoft', 'Samsung', 'LG', 'ASUS',
  'Acer', 'Sony', 'Canon', 'Epson', 'Logitech', 'Razer', 'Cisco', 'Netgear'
];

const models = [
  'MacBook Pro 16"', 'MacBook Air M2', 'Dell XPS 15', 'Dell Latitude 7420',
  'HP EliteBook 840', 'ThinkPad X1 Carbon', 'Surface Pro 9', 'iPad Pro 12.9"',
  'iPhone 14 Pro', 'Galaxy S23', 'LG UltraWide 34"', 'Dell P2422H',
  'HP LaserJet Pro', 'Canon EOS R6', 'Logitech MX Master 3', 'Sony WH-1000XM5'
];

const locations = [
  'Office 3rd Floor', 'Office 2nd Floor', 'Office 1st Floor',
  'Building A', 'Building B', 'Storage Room 201', 'Storage Room 202',
  'IT Department', 'Marketing Department', 'Sales Department',
  'Conference Room A', 'Conference Room B', 'Remote Location'
];

const categories = [
  'IT Infrastructure', 'Marketing', 'Sales', 'HR', 'Finance',
  'Operations', 'Development', 'Design', 'Support'
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSerial(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
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

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function main() {
  console.log('🗑️  Starting asset seed process...\n');

  // Get all users for assignment
  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.error('❌ No users found. Please create users first.');
    return;
  }

  console.log(`📊 Found ${users.length} users for assignment\n`);

  const now = new Date();
  const assetsToCreate = 100; // Create 100 dummy assets
  let created = 0;

  console.log(`🎯 Creating ${assetsToCreate} dummy assets...`);

  for (let i = 0; i < assetsToCreate; i++) {
    const assetType = randomElement(assetTypes);
    const brand = randomElement(brands);
    const model = randomElement(models);
    const category = randomElement(categories);
    const location = randomElement(locations);
    const status = randomElement(['IN_USE', 'IN_USE', 'IN_USE', 'SPARE', 'REPAIR']) as AssetStatus; // 60% IN_USE
    const acquisitionType = Math.random() > 0.9 ? AcquisitionType.TRANSFERRED : AcquisitionType.NEW_PURCHASE;

    // Purchase date: random date in the past 3 years
    const purchaseDate = addDays(now, -randomInt(1, 1095));

    // Warranty: 1-3 years from purchase date
    const warrantyExpiry = addMonths(purchaseDate, randomInt(12, 36));

    // Price: random between 500-5000 QAR
    const price = randomInt(500, 5000);
    const currency = Math.random() > 0.7 ? 'USD' : 'QAR';
    const priceQAR = currency === 'USD' ? price * 3.64 : price;

    // Assignment: 70% chance of being assigned if IN_USE
    const shouldAssign = status === 'IN_USE' && Math.random() > 0.3;
    const assignedUser = shouldAssign ? randomElement(users) : null;
    const assignmentDate = assignedUser ? addDays(purchaseDate, randomInt(0, 30)) : null;

    const serial = generateSerial();
    const configuration = assetType === 'Laptop' || assetType === 'Desktop'
      ? `${randomInt(8, 64)}GB RAM, ${randomInt(256, 2048)}GB SSD, Intel Core i${randomInt(5, 9)}`
      : null;

    try {
      await prisma.asset.create({
        data: {
          assetTag: `${assetType.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
          type: assetType,
          brand,
          model,
          serial,
          configuration,
          category,
          location,
          purchaseDate: acquisitionType !== 'TRANSFERRED' ? purchaseDate : null,
          warrantyExpiry: acquisitionType !== 'TRANSFERRED' ? warrantyExpiry : null,
          supplier: acquisitionType !== 'TRANSFERRED' ? `${randomElement(['Supplier', 'Vendor', 'Store'])} ${randomInt(1, 10)}` : null,
          invoiceNumber: acquisitionType !== 'TRANSFERRED' ? `INV-${now.getFullYear()}-${String(randomInt(1000, 9999))}` : null,
          price: acquisitionType !== 'TRANSFERRED' ? price : null,
          priceCurrency: acquisitionType !== 'TRANSFERRED' ? currency : null,
          priceQAR: acquisitionType !== 'TRANSFERRED' ? priceQAR : null,
          status,
          acquisitionType,
          transferNotes: acquisitionType === 'TRANSFERRED' ? 'Transferred from previous department' : null,
          assignedUser: assignedUser ? { connect: { id: assignedUser.id } } : undefined,
          assignmentDate: assignmentDate ? toDateString(assignmentDate) : null,
          notes: Math.random() > 0.7 ? `Additional notes for ${assetType} ${i + 1}` : null,
          createdAt: addDays(now, -randomInt(1, 365)), // Created sometime in the past year
        },
      });

      created++;
      if (created % 20 === 0) {
        console.log(`✨ Created ${created}/${assetsToCreate} assets...`);
      }
    } catch (error) {
      console.error(`❌ Error creating asset ${i + 1}:`, error);
    }
  }

  console.log(`\n✅ Successfully created ${created} dummy assets!`);
  console.log(`\n📊 Summary:`);
  const totalAssets = await prisma.asset.count();
  const inUseCount = await prisma.asset.count({ where: { status: 'IN_USE' } });
  const spareCount = await prisma.asset.count({ where: { status: 'SPARE' } });
  const repairCount = await prisma.asset.count({ where: { status: 'REPAIR' } });
  const assignedCount = await prisma.asset.count({ where: { assignedUserId: { not: null } } });

  console.log(`   - Total Assets: ${totalAssets}`);
  console.log(`   - In Use: ${inUseCount}`);
  console.log(`   - Spare: ${spareCount}`);
  console.log(`   - In Repair: ${repairCount}`);
  console.log(`   - Assigned: ${assignedCount}`);
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
