import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeUsageType() {
  console.log('🚀 Removing usageType from Subscription table...\n')

  try {
    // Drop the usageType column
    console.log('Dropping usageType column...')
    await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "usageType"`)
    console.log('✅ usageType column dropped')

    // Drop the UsageType enum
    console.log('\nDropping UsageType enum...')
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "UsageType"`)
    console.log('✅ UsageType enum dropped')

    console.log('\n✅ UsageType removal completed successfully!')

    // Verify the changes
    console.log('\n📊 Verification:')
    const columnCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Subscription'
      AND column_name = 'usageType'
    `
    console.log(
      'UsageType column exists:',
      columnCheck.length > 0 ? 'Yes (removal failed)' : 'No (successfully removed)'
    )
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

removeUsageType()
  .then(() => {
    console.log('\n✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
