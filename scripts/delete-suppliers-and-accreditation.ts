import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllSuppliersAndAccreditation() {
  console.log('🚨 Starting deletion of all suppliers and accreditation data...')
  console.log('This operation is IRREVERSIBLE!\n')

  try {
    // Delete all suppliers (will cascade delete supplier engagements)
    console.log('Deleting all suppliers and their engagements...')
    const suppliersDeleted = await prisma.supplier.deleteMany({})
    console.log(`✅ Deleted ${suppliersDeleted.count} suppliers`)

    // Delete all accreditation projects (will cascade delete all accreditations, history, and scans)
    console.log('\nDeleting all accreditation projects and related data...')
    const projectsDeleted = await prisma.accreditationProject.deleteMany({})
    console.log(`✅ Deleted ${projectsDeleted.count} accreditation projects`)

    // Verify deletion
    console.log('\n📊 Verification:')
    const remainingSuppliers = await prisma.supplier.count()
    const remainingEngagements = await prisma.supplierEngagement.count()
    const remainingProjects = await prisma.accreditationProject.count()
    const remainingAccreditations = await prisma.accreditation.count()
    const remainingHistory = await prisma.accreditationHistory.count()
    const remainingScans = await prisma.accreditationScan.count()

    console.log(`Remaining suppliers: ${remainingSuppliers}`)
    console.log(`Remaining supplier engagements: ${remainingEngagements}`)
    console.log(`Remaining accreditation projects: ${remainingProjects}`)
    console.log(`Remaining accreditations: ${remainingAccreditations}`)
    console.log(`Remaining accreditation history: ${remainingHistory}`)
    console.log(`Remaining accreditation scans: ${remainingScans}`)

    if (
      remainingSuppliers === 0 &&
      remainingEngagements === 0 &&
      remainingProjects === 0 &&
      remainingAccreditations === 0 &&
      remainingHistory === 0 &&
      remainingScans === 0
    ) {
      console.log('\n✅ All suppliers and accreditation data successfully deleted!')
    } else {
      console.log('\n⚠️ Some data may still remain. Please verify manually.')
    }
  } catch (error) {
    console.error('❌ Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllSuppliersAndAccreditation()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
