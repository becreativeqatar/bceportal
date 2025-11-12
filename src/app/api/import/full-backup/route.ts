import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import ExcelJS from 'exceljs';

export const maxDuration = 60; // Set max duration to 60 seconds for large imports

// Helper function to convert ExcelJS worksheet to JSON
function worksheetToJson(worksheet: ExcelJS.Worksheet | undefined): any[] {
  if (!worksheet) return [];

  const rows: any[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row contains headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || '';
      });
    } else {
      // Data rows
      const rowData: any = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          // Handle different cell types
          if (cell.type === ExcelJS.ValueType.Date) {
            rowData[header] = cell.value;
          } else if (cell.type === ExcelJS.ValueType.Number) {
            rowData[header] = cell.value;
          } else if (cell.type === ExcelJS.ValueType.Boolean) {
            rowData[header] = cell.value;
          } else if (cell.type === ExcelJS.ValueType.Null) {
            rowData[header] = null;
          } else {
            rowData[header] = cell.value;
          }
        }
      });
      rows.push(rowData);
    }
  });

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read the Excel file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Buffer);

    // Verify metadata
    const metadataSheet = workbook.getWorksheet('Metadata');
    if (!metadataSheet) {
      return NextResponse.json({ error: 'Invalid backup file: Metadata sheet not found' }, { status: 400 });
    }

    const metadata = worksheetToJson(metadataSheet)[0] as any;
    if (!metadata.version || !metadata.exportDate) {
      return NextResponse.json({ error: 'Invalid backup file: Missing metadata' }, { status: 400 });
    }

    // Read all sheets
    const usersSheet = workbook.getWorksheet('Users');
    const assetsSheet = workbook.getWorksheet('Assets');
    const subscriptionsSheet = workbook.getWorksheet('Subscriptions');
    const suppliersSheet = workbook.getWorksheet('Suppliers');
    const accreditationsSheet = workbook.getWorksheet('Accreditations');
    const projectsSheet = workbook.getWorksheet('Projects');

    if (!usersSheet || !assetsSheet || !subscriptionsSheet || !suppliersSheet || !accreditationsSheet || !projectsSheet) {
      return NextResponse.json({ error: 'Invalid backup file: Missing required sheets' }, { status: 400 });
    }

    const usersData = worksheetToJson(usersSheet) as any[];
    const assetsData = worksheetToJson(assetsSheet) as any[];
    const subscriptionsData = worksheetToJson(subscriptionsSheet) as any[];
    const suppliersData = worksheetToJson(suppliersSheet) as any[];
    const accreditationsData = worksheetToJson(accreditationsSheet) as any[];
    const projectsData = worksheetToJson(projectsSheet) as any[];

    // Optional history sheets (may not exist in older backups)
    const assetHistorySheet = workbook.getWorksheet('Asset History');
    const subscriptionHistorySheet = workbook.getWorksheet('Subscription History');
    const supplierEngagementsSheet = workbook.getWorksheet('Supplier Engagements');
    const accreditationHistorySheet = workbook.getWorksheet('Accreditation History');
    const accreditationScansSheet = workbook.getWorksheet('Accreditation Scans');
    const activityLogsSheet = workbook.getWorksheet('Activity Logs');
    const maintenanceRecordsSheet = workbook.getWorksheet('Maintenance Records');

    const assetHistoryData = assetHistorySheet ? worksheetToJson(assetHistorySheet) as any[] : [];
    const subscriptionHistoryData = subscriptionHistorySheet ? worksheetToJson(subscriptionHistorySheet) as any[] : [];
    const supplierEngagementsData = supplierEngagementsSheet ? worksheetToJson(supplierEngagementsSheet) as any[] : [];
    const accreditationHistoryData = accreditationHistorySheet ? worksheetToJson(accreditationHistorySheet) as any[] : [];
    const accreditationScansData = accreditationScansSheet ? worksheetToJson(accreditationScansSheet) as any[] : [];
    const activityLogsData = activityLogsSheet ? worksheetToJson(activityLogsSheet) as any[] : [];
    const maintenanceRecordsData = maintenanceRecordsSheet ? worksheetToJson(maintenanceRecordsSheet) as any[] : [];

    const importedCounts = {
      users: 0,
      assets: 0,
      subscriptions: 0,
      suppliers: 0,
      accreditations: 0,
      projects: 0,
      assetHistory: 0,
      subscriptionHistory: 0,
      supplierEngagements: 0,
      accreditationHistory: 0,
      accreditationScans: 0,
      activityLogs: 0,
      maintenanceRecords: 0,
    };

    // Helper function to parse dates
    const parseDate = (value: any): Date | null => {
      if (!value || value === '') return null;
      // Handle Date objects (ExcelJS returns Date objects for date cells)
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
      }
      // Handle date strings
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      // Handle Excel serial dates (in case they come through as numbers)
      if (typeof value === 'number') {
        // Excel serial date: days since 1900-01-01 (with 1900 being day 1)
        const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    };

    // Import in order: Users -> Projects -> Assets/Subscriptions/Suppliers/Accreditations

    // Import Users
    console.log(`Importing ${usersData.length} users...`);
    for (const userData of usersData) {
      try {
        await prisma.user.upsert({
          where: { id: userData.id },
          create: {
            id: userData.id,
            name: userData.name || null,
            email: userData.email,
            role: userData.role,
            isSystemAccount: userData.isSystemAccount === 'Yes',
            emailVerified: parseDate(userData.emailVerified),
            createdAt: parseDate(userData.createdAt) || new Date(),
            updatedAt: parseDate(userData.updatedAt) || new Date(),
          },
          update: {
            name: userData.name || null,
            role: userData.role,
            isSystemAccount: userData.isSystemAccount === 'Yes',
            emailVerified: parseDate(userData.emailVerified),
            updatedAt: parseDate(userData.updatedAt) || new Date(),
          },
        });
        importedCounts.users++;
      } catch (error) {
        console.error(`Error importing user ${userData.email}:`, error);
      }
    }

    // Import Projects
    console.log(`Importing ${projectsData.length} projects...`);
    for (const projectData of projectsData) {
      try {
        await prisma.accreditationProject.upsert({
          where: { id: projectData.id },
          create: {
            id: projectData.id,
            name: projectData.name,
            code: projectData.code || null,
            bumpInStart: parseDate(projectData.bumpInStart) || new Date(),
            bumpInEnd: parseDate(projectData.bumpInEnd) || new Date(),
            liveStart: parseDate(projectData.liveStart) || new Date(),
            liveEnd: parseDate(projectData.liveEnd) || new Date(),
            bumpOutStart: parseDate(projectData.bumpOutStart) || new Date(),
            bumpOutEnd: parseDate(projectData.bumpOutEnd) || new Date(),
            accessGroups: projectData.accessGroups ? JSON.parse(projectData.accessGroups) : [],
            isActive: projectData.isActive === 'Yes',
            createdAt: parseDate(projectData.createdAt) || new Date(),
            updatedAt: parseDate(projectData.updatedAt) || new Date(),
          },
          update: {
            name: projectData.name,
            code: projectData.code || null,
            bumpInStart: parseDate(projectData.bumpInStart) || new Date(),
            bumpInEnd: parseDate(projectData.bumpInEnd) || new Date(),
            liveStart: parseDate(projectData.liveStart) || new Date(),
            liveEnd: parseDate(projectData.liveEnd) || new Date(),
            bumpOutStart: parseDate(projectData.bumpOutStart) || new Date(),
            bumpOutEnd: parseDate(projectData.bumpOutEnd) || new Date(),
            accessGroups: projectData.accessGroups ? JSON.parse(projectData.accessGroups) : [],
            isActive: projectData.isActive === 'Yes',
            updatedAt: parseDate(projectData.updatedAt) || new Date(),
          },
        });
        importedCounts.projects++;
      } catch (error) {
        console.error(`Error importing project ${projectData.name}:`, error);
      }
    }

    // Import Assets
    console.log(`Importing ${assetsData.length} assets...`);
    for (const assetData of assetsData) {
      try {
        await prisma.asset.upsert({
          where: { id: assetData.id },
          create: {
            id: assetData.id,
            assetTag: assetData.assetTag || null,
            type: assetData.type,
            category: assetData.category || null,
            brand: assetData.brand || null,
            model: assetData.model,
            serial: assetData.serial || null,
            configuration: assetData.configuration || null,
            purchaseDate: parseDate(assetData.purchaseDate),
            warrantyExpiry: parseDate(assetData.warrantyExpiry),
            supplier: assetData.supplier || null,
            invoiceNumber: assetData.invoiceNumber || null,
            assignedUserId: assetData.assignedUserId || null,
            status: assetData.status,
            acquisitionType: assetData.acquisitionType,
            location: assetData.location || null,
            price: assetData.price ? String(assetData.price) : null,
            priceCurrency: assetData.priceCurrency || null,
            priceQAR: assetData.priceQAR ? String(assetData.priceQAR) : null,
            notes: assetData.notes || null,
            createdAt: parseDate(assetData.createdAt) || new Date(),
            updatedAt: parseDate(assetData.updatedAt) || new Date(),
          },
          update: {
            assetTag: assetData.assetTag || null,
            type: assetData.type,
            category: assetData.category || null,
            brand: assetData.brand || null,
            model: assetData.model,
            serial: assetData.serial || null,
            configuration: assetData.configuration || null,
            purchaseDate: parseDate(assetData.purchaseDate),
            warrantyExpiry: parseDate(assetData.warrantyExpiry),
            supplier: assetData.supplier || null,
            invoiceNumber: assetData.invoiceNumber || null,
            assignedUserId: assetData.assignedUserId || null,
            status: assetData.status,
            acquisitionType: assetData.acquisitionType,
            location: assetData.location || null,
            price: assetData.price ? String(assetData.price) : null,
            priceCurrency: assetData.priceCurrency || null,
            priceQAR: assetData.priceQAR ? String(assetData.priceQAR) : null,
            notes: assetData.notes || null,
            updatedAt: parseDate(assetData.updatedAt) || new Date(),
          },
        });
        importedCounts.assets++;
      } catch (error) {
        console.error(`Error importing asset ${assetData.assetTag}:`, error);
      }
    }

    // Import Subscriptions
    console.log(`Importing ${subscriptionsData.length} subscriptions...`);
    for (const subData of subscriptionsData) {
      try {
        await prisma.subscription.upsert({
          where: { id: subData.id },
          create: {
            id: subData.id,
            serviceName: subData.serviceName,
            category: subData.category || null,
            accountId: subData.accountId || null,
            purchaseDate: parseDate(subData.purchaseDate),
            renewalDate: parseDate(subData.renewalDate),
            billingCycle: subData.billingCycle,
            costPerCycle: subData.costPerCycle ? String(subData.costPerCycle) : null,
            costCurrency: subData.costCurrency || null,
            costQAR: subData.costQAR ? String(subData.costQAR) : null,
            vendor: subData.vendor || null,
            status: subData.status,
            assignedUserId: subData.assignedUserId || null,
            autoRenew: subData.autoRenew === 'Yes',
            paymentMethod: subData.paymentMethod || null,
            notes: subData.notes || null,
            cancelledAt: parseDate(subData.cancelledAt),
            reactivatedAt: parseDate(subData.reactivatedAt),
            lastActiveRenewalDate: parseDate(subData.lastActiveRenewalDate),
            createdAt: parseDate(subData.createdAt) || new Date(),
            updatedAt: parseDate(subData.updatedAt) || new Date(),
          },
          update: {
            serviceName: subData.serviceName,
            category: subData.category || null,
            accountId: subData.accountId || null,
            purchaseDate: parseDate(subData.purchaseDate),
            renewalDate: parseDate(subData.renewalDate),
            billingCycle: subData.billingCycle,
            costPerCycle: subData.costPerCycle ? String(subData.costPerCycle) : null,
            costCurrency: subData.costCurrency || null,
            costQAR: subData.costQAR ? String(subData.costQAR) : null,
            vendor: subData.vendor || null,
            status: subData.status,
            assignedUserId: subData.assignedUserId || null,
            autoRenew: subData.autoRenew === 'Yes',
            paymentMethod: subData.paymentMethod || null,
            notes: subData.notes || null,
            cancelledAt: parseDate(subData.cancelledAt),
            reactivatedAt: parseDate(subData.reactivatedAt),
            lastActiveRenewalDate: parseDate(subData.lastActiveRenewalDate),
            updatedAt: parseDate(subData.updatedAt) || new Date(),
          },
        });
        importedCounts.subscriptions++;
      } catch (error) {
        console.error(`Error importing subscription ${subData.serviceName}:`, error);
      }
    }

    // Import Suppliers
    console.log(`Importing ${suppliersData.length} suppliers...`);
    for (const suppData of suppliersData) {
      try {
        await prisma.supplier.upsert({
          where: { id: suppData.id },
          create: {
            id: suppData.id,
            suppCode: suppData.suppCode || null,
            name: suppData.name,
            category: suppData.category,
            address: suppData.address || null,
            city: suppData.city || null,
            country: suppData.country || null,
            website: suppData.website || null,
            establishmentYear: suppData.establishmentYear ? parseInt(suppData.establishmentYear) : null,
            primaryContactName: suppData.primaryContactName || null,
            primaryContactTitle: suppData.primaryContactTitle || null,
            primaryContactEmail: suppData.primaryContactEmail || null,
            primaryContactMobile: suppData.primaryContactMobile || null,
            secondaryContactName: suppData.secondaryContactName || null,
            secondaryContactTitle: suppData.secondaryContactTitle || null,
            secondaryContactEmail: suppData.secondaryContactEmail || null,
            secondaryContactMobile: suppData.secondaryContactMobile || null,
            paymentTerms: suppData.paymentTerms || null,
            additionalInfo: suppData.additionalInfo || null,
            status: suppData.status,
            rejectionReason: suppData.rejectionReason || null,
            approvedById: suppData.approvedById || null,
            approvedAt: parseDate(suppData.approvedAt),
            createdAt: parseDate(suppData.createdAt) || new Date(),
            updatedAt: parseDate(suppData.updatedAt) || new Date(),
          },
          update: {
            suppCode: suppData.suppCode || null,
            name: suppData.name,
            category: suppData.category,
            address: suppData.address || null,
            city: suppData.city || null,
            country: suppData.country || null,
            website: suppData.website || null,
            establishmentYear: suppData.establishmentYear ? parseInt(suppData.establishmentYear) : null,
            primaryContactName: suppData.primaryContactName || null,
            primaryContactTitle: suppData.primaryContactTitle || null,
            primaryContactEmail: suppData.primaryContactEmail || null,
            primaryContactMobile: suppData.primaryContactMobile || null,
            secondaryContactName: suppData.secondaryContactName || null,
            secondaryContactTitle: suppData.secondaryContactTitle || null,
            secondaryContactEmail: suppData.secondaryContactEmail || null,
            secondaryContactMobile: suppData.secondaryContactMobile || null,
            paymentTerms: suppData.paymentTerms || null,
            additionalInfo: suppData.additionalInfo || null,
            status: suppData.status,
            rejectionReason: suppData.rejectionReason || null,
            approvedById: suppData.approvedById || null,
            approvedAt: parseDate(suppData.approvedAt),
            updatedAt: parseDate(suppData.updatedAt) || new Date(),
          },
        });
        importedCounts.suppliers++;
      } catch (error) {
        console.error(`Error importing supplier ${suppData.name}:`, error);
      }
    }

    // Import Accreditations
    console.log(`Importing ${accreditationsData.length} accreditations...`);
    for (const accData of accreditationsData) {
      try {
        await prisma.accreditation.upsert({
          where: { id: accData.id },
          create: {
            id: accData.id,
            accreditationNumber: accData.accreditationNumber,
            projectId: accData.projectId,
            firstName: accData.firstName,
            lastName: accData.lastName,
            organization: accData.organization,
            jobTitle: accData.jobTitle,
            accessGroup: accData.accessGroup,
            profilePhotoUrl: accData.profilePhotoUrl || null,
            qidNumber: accData.qidNumber || null,
            qidExpiry: parseDate(accData.qidExpiry),
            passportNumber: accData.passportNumber || null,
            passportCountry: accData.passportCountry || null,
            passportExpiry: parseDate(accData.passportExpiry),
            hayyaVisaNumber: accData.hayyaVisaNumber || null,
            hayyaVisaExpiry: parseDate(accData.hayyaVisaExpiry),
            hasBumpInAccess: accData.hasBumpInAccess === 'Yes',
            bumpInStart: parseDate(accData.bumpInStart),
            bumpInEnd: parseDate(accData.bumpInEnd),
            hasLiveAccess: accData.hasLiveAccess === 'Yes',
            liveStart: parseDate(accData.liveStart),
            liveEnd: parseDate(accData.liveEnd),
            hasBumpOutAccess: accData.hasBumpOutAccess === 'Yes',
            bumpOutStart: parseDate(accData.bumpOutStart),
            bumpOutEnd: parseDate(accData.bumpOutEnd),
            status: accData.status,
            qrCodeToken: accData.qrCodeToken || null,
            createdById: accData.createdById,
            approvedById: accData.approvedById || null,
            approvedAt: parseDate(accData.approvedAt),
            revokedById: accData.revokedById || null,
            revokedAt: parseDate(accData.revokedAt),
            revocationReason: accData.revocationReason || null,
            createdAt: parseDate(accData.createdAt) || new Date(),
            updatedAt: parseDate(accData.updatedAt) || new Date(),
          },
          update: {
            accreditationNumber: accData.accreditationNumber,
            projectId: accData.projectId,
            firstName: accData.firstName,
            lastName: accData.lastName,
            organization: accData.organization,
            jobTitle: accData.jobTitle,
            accessGroup: accData.accessGroup,
            profilePhotoUrl: accData.profilePhotoUrl || null,
            qidNumber: accData.qidNumber || null,
            qidExpiry: parseDate(accData.qidExpiry),
            passportNumber: accData.passportNumber || null,
            passportCountry: accData.passportCountry || null,
            passportExpiry: parseDate(accData.passportExpiry),
            hayyaVisaNumber: accData.hayyaVisaNumber || null,
            hayyaVisaExpiry: parseDate(accData.hayyaVisaExpiry),
            hasBumpInAccess: accData.hasBumpInAccess === 'Yes',
            bumpInStart: parseDate(accData.bumpInStart),
            bumpInEnd: parseDate(accData.bumpInEnd),
            hasLiveAccess: accData.hasLiveAccess === 'Yes',
            liveStart: parseDate(accData.liveStart),
            liveEnd: parseDate(accData.liveEnd),
            hasBumpOutAccess: accData.hasBumpOutAccess === 'Yes',
            bumpOutStart: parseDate(accData.bumpOutStart),
            bumpOutEnd: parseDate(accData.bumpOutEnd),
            status: accData.status,
            qrCodeToken: accData.qrCodeToken || null,
            approvedById: accData.approvedById || null,
            approvedAt: parseDate(accData.approvedAt),
            revokedById: accData.revokedById || null,
            revokedAt: parseDate(accData.revokedAt),
            revocationReason: accData.revocationReason || null,
            updatedAt: parseDate(accData.updatedAt) || new Date(),
          },
        });
        importedCounts.accreditations++;
      } catch (error) {
        console.error(`Error importing accreditation ${accData.accreditationNumber}:`, error);
      }
    }

    // Import history tables (these come after main tables are imported)

    // Import Asset History
    console.log(`Importing ${assetHistoryData.length} asset history records...`);
    for (const historyData of assetHistoryData) {
      try {
        await prisma.assetHistory.create({
          data: {
            id: historyData.id,
            assetId: historyData.assetId,
            action: historyData.action,
            fromUserId: historyData.fromUserId || null,
            toUserId: historyData.toUserId || null,
            performedBy: historyData.performedBy || historyData.performerId,
            notes: historyData.notes || null,
            createdAt: parseDate(historyData.createdAt) || new Date(),
          },
        });
        importedCounts.assetHistory++;
      } catch (error) {
        console.error(`Error importing asset history ${historyData.id}:`, error);
      }
    }

    // Import Subscription History
    console.log(`Importing ${subscriptionHistoryData.length} subscription history records...`);
    for (const historyData of subscriptionHistoryData) {
      try {
        await prisma.subscriptionHistory.create({
          data: {
            id: historyData.id,
            subscriptionId: historyData.subscriptionId,
            action: historyData.action,
            oldStatus: historyData.oldStatus || null,
            newStatus: historyData.newStatus || null,
            oldRenewalDate: parseDate(historyData.oldRenewalDate),
            newRenewalDate: parseDate(historyData.newRenewalDate),
            oldUserId: historyData.oldUserId || null,
            newUserId: historyData.newUserId || null,
            assignmentDate: parseDate(historyData.assignmentDate),
            reactivationDate: parseDate(historyData.reactivationDate),
            notes: historyData.notes || null,
            performedBy: historyData.performedBy || historyData.performerId,
            createdAt: parseDate(historyData.createdAt) || new Date(),
          },
        });
        importedCounts.subscriptionHistory++;
      } catch (error) {
        console.error(`Error importing subscription history ${historyData.id}:`, error);
      }
    }

    // Import Supplier Engagements
    console.log(`Importing ${supplierEngagementsData.length} supplier engagements...`);
    for (const engagementData of supplierEngagementsData) {
      try {
        await prisma.supplierEngagement.create({
          data: {
            id: engagementData.id,
            supplierId: engagementData.supplierId,
            date: parseDate(engagementData.date || engagementData.startDate) || new Date(),
            notes: engagementData.notes || engagementData.details || engagementData.description || '',
            rating: engagementData.rating ? parseInt(engagementData.rating) : null,
            createdById: engagementData.createdById,
            createdAt: parseDate(engagementData.createdAt) || new Date(),
          },
        });
        importedCounts.supplierEngagements++;
      } catch (error) {
        console.error(`Error importing supplier engagement ${engagementData.id}:`, error);
      }
    }

    // Import Accreditation History
    console.log(`Importing ${accreditationHistoryData.length} accreditation history records...`);
    for (const historyData of accreditationHistoryData) {
      try {
        await prisma.accreditationHistory.create({
          data: {
            id: historyData.id,
            accreditationId: historyData.accreditationId,
            action: historyData.action,
            oldStatus: historyData.oldStatus || null,
            newStatus: historyData.newStatus || null,
            notes: historyData.notes || null,
            performedById: historyData.performedBy || historyData.performedById,
            createdAt: parseDate(historyData.createdAt) || new Date(),
          },
        });
        importedCounts.accreditationHistory++;
      } catch (error) {
        console.error(`Error importing accreditation history ${historyData.id}:`, error);
      }
    }

    // Import Accreditation Scans
    console.log(`Importing ${accreditationScansData.length} accreditation scans...`);
    for (const scanData of accreditationScansData) {
      try {
        await prisma.accreditationScan.create({
          data: {
            id: scanData.id,
            accreditationId: scanData.accreditationId,
            location: scanData.scanLocation || scanData.location || null,
            notes: scanData.notes || null,
            scannedById: scanData.scannedById,
            scannedAt: parseDate(scanData.scannedAt) || new Date(),
            wasValid: scanData.wasValid === 'true' || scanData.wasValid === true || true,
            validPhases: scanData.validPhases ? JSON.parse(scanData.validPhases) : null,
            device: scanData.device || null,
            ipAddress: scanData.ipAddress || null,
          },
        });
        importedCounts.accreditationScans++;
      } catch (error) {
        console.error(`Error importing accreditation scan ${scanData.id}:`, error);
      }
    }

    // Import Activity Logs
    console.log(`Importing ${activityLogsData.length} activity logs...`);
    for (const logData of activityLogsData) {
      try {
        await prisma.activityLog.create({
          data: {
            id: logData.id,
            entityType: logData.entityType,
            entityId: logData.entityId,
            action: logData.action,
            actorUserId: logData.actorUserId || null,
            payload: logData.metadata || logData.details || null,
            at: parseDate(logData.createdAt) || new Date(),
          },
        });
        importedCounts.activityLogs++;
      } catch (error) {
        console.error(`Error importing activity log ${logData.id}:`, error);
      }
    }

    // Import Maintenance Records
    console.log(`Importing ${maintenanceRecordsData.length} maintenance records...`);
    for (const maintenanceData of maintenanceRecordsData) {
      try {
        await prisma.maintenanceRecord.create({
          data: {
            id: maintenanceData.id,
            assetId: maintenanceData.assetId,
            maintenanceDate: parseDate(maintenanceData.date || maintenanceData.performedDate) || new Date(),
            notes: maintenanceData.details || maintenanceData.description || maintenanceData.notes || null,
            performedBy: maintenanceData.technician || maintenanceData.performedBy || null,
            createdAt: parseDate(maintenanceData.createdAt) || new Date(),
            updatedAt: parseDate(maintenanceData.updatedAt) || new Date(),
          },
        });
        importedCounts.maintenanceRecords++;
      } catch (error) {
        console.error(`Error importing maintenance record ${maintenanceData.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Full backup imported successfully',
      imported: importedCounts,
      metadata: {
        originalExportDate: metadata.exportDate,
        originalExportedBy: metadata.exportedBy,
        version: metadata.version,
      },
    });
  } catch (error) {
    console.error('Full backup import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import full backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
