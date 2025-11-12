-- Migration script for user role changes
-- This script handles the migration from isTemporaryStaff to role-based system

-- Step 1: Add new role values to the Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEMP_STAFF';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCREDITATION_ADDER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCREDITATION_APPROVER';

-- Step 2: Update users with isTemporaryStaff=true to TEMP_STAFF role
UPDATE "User"
SET role = 'TEMP_STAFF'::"Role"
WHERE "isTemporaryStaff" = true AND "deletedAt" IS NULL;

-- Step 3: Log the migration for reference
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM "User"
  WHERE role = 'TEMP_STAFF'::"Role";

  RAISE NOTICE 'Migrated % users to TEMP_STAFF role', updated_count;
END $$;

-- Step 4: Drop the soft-delete related columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedById";
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletionNotes";

-- Step 5: Drop the isTemporaryStaff column
ALTER TABLE "User" DROP COLUMN IF EXISTS "isTemporaryStaff";

-- Migration complete
