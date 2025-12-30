-- ============================================================================
-- BCE Document Numbering Configuration Migration
-- Run this SQL directly in your PostgreSQL database
-- ============================================================================

-- Create DocumentNumberConfig table
CREATE TABLE IF NOT EXISTS "DocumentNumberConfig" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityLabel" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "includeMonth" BOOLEAN NOT NULL DEFAULT false,
    "sequenceDigits" INTEGER NOT NULL DEFAULT 3,
    "isAssetCategory" BOOLEAN NOT NULL DEFAULT false,
    "isSystemRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentNumberConfig_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on entityType
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentNumberConfig_entityType_key" ON "DocumentNumberConfig"("entityType");

-- Create unique constraint on code + isAssetCategory combination
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentNumberConfig_code_isAssetCategory_key" ON "DocumentNumberConfig"("code", "isAssetCategory");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "DocumentNumberConfig_isAssetCategory_idx" ON "DocumentNumberConfig"("isAssetCategory");
CREATE INDEX IF NOT EXISTS "DocumentNumberConfig_isActive_idx" ON "DocumentNumberConfig"("isActive");

-- ============================================================================
-- Insert Default Document Types (8 types)
-- ============================================================================

INSERT INTO "DocumentNumberConfig" ("id", "entityType", "entityLabel", "code", "description", "includeMonth", "sequenceDigits", "isAssetCategory", "isSystemRequired", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'LEAVE_REQUEST', 'Leave Request', 'LV', 'Employee leave requests', false, 3, false, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'SUPPLIER', 'Supplier', 'SP', 'Vendor/supplier records', false, 3, false, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'PAYROLL_RUN', 'Payroll Run', 'PY', 'Monthly payroll runs', true, 3, false, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'PAYSLIP', 'Payslip', 'PS', 'Employee payslips', true, 3, false, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'EMPLOYEE_LOAN', 'Employee Loan', 'LN', 'Employee loans and advances', false, 3, false, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_REQUEST', 'Asset Request', 'AR', 'Asset request/return workflow', false, 3, false, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'PROJECT', 'Project', 'PJ', 'Project tracking', false, 3, false, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'PURCHASE_REQUEST', 'Purchase Request', 'PR', 'Purchase requests', true, 3, false, true, true, NOW(), NOW())
ON CONFLICT ("entityType") DO NOTHING;

-- ============================================================================
-- Insert Default Asset Categories (18 categories)
-- ============================================================================

INSERT INTO "DocumentNumberConfig" ("id", "entityType", "entityLabel", "code", "description", "includeMonth", "sequenceDigits", "isAssetCategory", "isSystemRequired", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'ASSET_CP', 'Asset - Computing', 'CP', 'Laptops, desktops, servers, workstations', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_MO', 'Asset - Mobile Devices', 'MO', 'Tablets, smartphones, mobile devices', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_DP', 'Asset - Display', 'DP', 'Monitors, projectors, displays', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_AV', 'Asset - Audio Visual', 'AV', 'Cameras, audio equipment, video gear', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_NW', 'Asset - Networking', 'NW', 'Routers, switches, access points', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_PN', 'Asset - Printing', 'PN', 'Printers, scanners, copiers', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_CB', 'Asset - Cables', 'CB', 'Cables, adapters, connectors', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_ST', 'Asset - Storage', 'ST', 'External drives, NAS, storage devices', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_PT', 'Asset - Peripherals', 'PT', 'Keyboards, mice, accessories', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_OF', 'Asset - Office Furniture', 'OF', 'Desks, chairs, furniture', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_OE', 'Asset - Office Equipment', 'OE', 'Whiteboards, shredders', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_AP', 'Asset - Appliances', 'AP', 'Kitchen appliances, AC units', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_SF', 'Asset - Safety', 'SF', 'Fire extinguishers, first aid', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_CL', 'Asset - Cleaning', 'CL', 'Cleaning equipment', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_VH', 'Asset - Vehicles', 'VH', 'Company vehicles', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_ME', 'Asset - Miscellaneous', 'ME', 'Other equipment', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_SW', 'Asset - Software/SaaS', 'SW', 'Software licenses, SaaS subscriptions', false, 3, true, true, true, NOW(), NOW()),
    (gen_random_uuid(), 'ASSET_DG', 'Asset - Digital Assets', 'DG', 'Domains, SSL certificates', false, 3, true, true, true, NOW(), NOW())
ON CONFLICT ("entityType") DO NOTHING;

-- ============================================================================
-- Insert Company Prefix Setting
-- ============================================================================

INSERT INTO "SystemSettings" ("id", "key", "value", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'companyPrefix', 'BCE', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- ============================================================================
-- Done!
-- ============================================================================
