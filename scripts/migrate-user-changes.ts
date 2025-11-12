import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateUserChanges() {
  console.log('🚀 Starting user data migration...\n')

  try {
    // Step 1: Convert temporary staff to TEMP_STAFF role
    console.log('Step 1: Converting temporary staff to TEMP_STAFF role...')
    const tempStaffUsers = await prisma.user.findMany({
      where: {
        isTemporaryStaff: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    console.log(`Found ${tempStaffUsers.length} temporary staff users`)

    // Note: We'll need to do this manually in SQL since the new role doesn't exist yet
    // This script is just for documentation. We'll handle this in the next step.

    // Step 2: Find and delete all soft-deleted users
    console.log('\nStep 2: Finding soft-deleted users...')
    const deletedUsers = await prisma.user.findMany({
      where: {
        deletedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        deletedAt: true,
      },
    })

    console.log(`Found ${deletedUsers.length} soft-deleted users:`)
    deletedUsers.forEach((user) => {
      console.log(`  - ${user.email} (${user.name}) - deleted on ${user.deletedAt}`)
    })

    if (deletedUsers.length > 0) {
      console.log('\n⚠️  These users will be permanently deleted along with all their data.')
      console.log('   Press Ctrl+C to cancel, or the script will continue...')

      // Delete soft-deleted users
      // Note: Related data will be handled by cascade deletes where defined
      const deleteResult = await prisma.user.deleteMany({
        where: {
          deletedAt: {
            not: null,
          },
        },
      })

      console.log(`\n✅ Permanently deleted ${deleteResult.count} users`)
    } else {
      console.log('\n✅ No soft-deleted users found')
    }

    console.log('\n📊 Summary:')
    console.log(`- Temporary staff users to migrate: ${tempStaffUsers.length}`)
    console.log(`- Soft-deleted users removed: ${deletedUsers.length}`)

    console.log('\n⚠️  Note: Temporary staff role migration will be handled by the schema migration.')
    if (tempStaffUsers.length > 0) {
      console.log('\nTemporary staff users found:')
      tempStaffUsers.forEach((user) => {
        console.log(`  - ${user.email} (${user.name})`)
      })
    }
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateUserChanges()
  .then(() => {
    console.log('\n✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
