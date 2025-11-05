import { PrismaClient, SupplierStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding suppliers...');

  const suppliers = [
    {
      name: 'TechVision Solutions',
      suppCode: 'SUPP-0001',
      category: 'Electronics & Technology',
      address: '123 Innovation Drive',
      city: 'Doha',
      country: 'Qatar',
      website: 'https://techvision-solutions.com',
      establishmentYear: 2015,
      primaryContactName: 'Ahmed Al-Mansouri',
      primaryContactTitle: 'Sales Director',
      primaryContactEmail: 'ahmed@techvision-solutions.com',
      primaryContactMobile: '+974 5555 1234',
      paymentTerms: 'Net 30',
      status: SupplierStatus.APPROVED,
    },
    {
      name: 'Global Office Supplies',
      suppCode: 'SUPP-0002',
      category: 'Office Supplies & Equipment',
      address: '456 Commerce Street',
      city: 'Dubai',
      country: 'UAE',
      website: 'https://globaloffice.ae',
      establishmentYear: 2010,
      primaryContactName: 'Sara Johnson',
      primaryContactTitle: 'Account Manager',
      primaryContactEmail: 'sara@globaloffice.ae',
      primaryContactMobile: '+971 50 123 4567',
      secondaryContactName: 'Mohammed Ali',
      secondaryContactTitle: 'Customer Support',
      secondaryContactEmail: 'support@globaloffice.ae',
      paymentTerms: 'Net 45',
      status: SupplierStatus.APPROVED,
    },
    {
      name: 'CreativeWorks Studio',
      suppCode: 'SUPP-0003',
      category: 'Design & Creative Services',
      address: '789 Arts Boulevard',
      city: 'Doha',
      country: 'Qatar',
      website: 'https://creativeworks.qa',
      establishmentYear: 2018,
      primaryContactName: 'Fatima Al-Thani',
      primaryContactTitle: 'Creative Director',
      primaryContactEmail: 'fatima@creativeworks.qa',
      primaryContactMobile: '+974 5555 9876',
      paymentTerms: '50% upfront, 50% on delivery',
      additionalInfo: 'Award-winning design agency specializing in branding and digital experiences',
      status: SupplierStatus.APPROVED,
    },
    {
      name: 'Digital Marketing Pro',
      suppCode: 'SUPP-0004',
      category: 'Marketing & Advertising',
      address: '321 Media Center',
      city: 'Doha',
      country: 'Qatar',
      website: 'https://digitalmarketingpro.qa',
      establishmentYear: 2019,
      primaryContactName: 'Khalid Rahman',
      primaryContactTitle: 'Marketing Director',
      primaryContactEmail: 'khalid@digitalmarketingpro.qa',
      primaryContactMobile: '+974 5555 5678',
      paymentTerms: 'Monthly retainer',
      status: SupplierStatus.APPROVED,
    },
    {
      name: 'Print Masters Qatar',
      suppCode: 'SUPP-0005',
      category: 'Printing & Production',
      address: '654 Industrial Area',
      city: 'Doha',
      country: 'Qatar',
      website: 'https://printmasters.qa',
      establishmentYear: 2012,
      primaryContactName: 'Omar Hassan',
      primaryContactTitle: 'Production Manager',
      primaryContactEmail: 'omar@printmasters.qa',
      primaryContactMobile: '+974 5555 3456',
      paymentTerms: 'Net 15',
      additionalInfo: 'Large format printing, signage, and promotional materials',
      status: SupplierStatus.APPROVED,
    },
  ];

  for (const supplier of suppliers) {
    const created = await prisma.supplier.create({
      data: supplier,
    });
    console.log(`Created supplier: ${created.name} (${created.suppCode})`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding suppliers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
