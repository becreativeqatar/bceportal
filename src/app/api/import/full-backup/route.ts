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
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

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
    const subscriptionHistorySheet = workbook.getWorksheet('Subscription History') || workbook.getWorksheet('Sub History');
    const supplierEngagementsSheet = workbook.getWorksheet('Supplier Engagements');
    const accreditationHistorySheet = workbook.getWorksheet('Accreditation History') || workbook.getWorksheet('Accred History');
    const accreditationScansSheet = workbook.getWorksheet('Accreditation Scans') || workbook.getWorksheet('Accred Scans');
    const activityLogsSheet = workbook.getWorksheet('Activity Logs');
    const maintenanceRecordsSheet = workbook.getWorksheet('Maintenance Records') || workbook.getWorksheet('Maintenance');

    // HR Profiles (v4.0+)
    const hrProfilesSheet = workbook.getWorksheet('HR Profiles');
    const profileChangesSheet = workbook.getWorksheet('Profile Changes');

    // Task Management (v4.0+)
    const boardsSheet = workbook.getWorksheet('Boards');
    const boardMembersSheet = workbook.getWorksheet('Board Members');
    const taskColumnsSheet = workbook.getWorksheet('Task Columns');
    const tasksSheet = workbook.getWorksheet('Tasks');
    const taskAssigneesSheet = workbook.getWorksheet('Task Assignees');
    const taskLabelsSheet = workbook.getWorksheet('Task Labels');
    const labelAssignmentsSheet = workbook.getWorksheet('Label Assignments');
    const checklistItemsSheet = workbook.getWorksheet('Checklist Items');
    const taskCommentsSheet = workbook.getWorksheet('Task Comments');
    const taskAttachmentsSheet = workbook.getWorksheet('Task Attachments');
    const taskHistorySheet = workbook.getWorksheet('Task History');

    // Purchase Requests (v4.0+)
    const purchaseRequestsSheet = workbook.getWorksheet('Purchase Requests');
    const prItemsSheet = workbook.getWorksheet('PR Items');
    const prHistorySheet = workbook.getWorksheet('PR History');

    const assetHistoryData = assetHistorySheet ? worksheetToJson(assetHistorySheet) as any[] : [];
    const subscriptionHistoryData = subscriptionHistorySheet ? worksheetToJson(subscriptionHistorySheet) as any[] : [];
    const supplierEngagementsData = supplierEngagementsSheet ? worksheetToJson(supplierEngagementsSheet) as any[] : [];
    const accreditationHistoryData = accreditationHistorySheet ? worksheetToJson(accreditationHistorySheet) as any[] : [];
    const accreditationScansData = accreditationScansSheet ? worksheetToJson(accreditationScansSheet) as any[] : [];
    const activityLogsData = activityLogsSheet ? worksheetToJson(activityLogsSheet) as any[] : [];
    const maintenanceRecordsData = maintenanceRecordsSheet ? worksheetToJson(maintenanceRecordsSheet) as any[] : [];

    // HR Data
    const hrProfilesData = hrProfilesSheet ? worksheetToJson(hrProfilesSheet) as any[] : [];
    const profileChangesData = profileChangesSheet ? worksheetToJson(profileChangesSheet) as any[] : [];

    // Task Management Data
    const boardsData = boardsSheet ? worksheetToJson(boardsSheet) as any[] : [];
    const boardMembersData = boardMembersSheet ? worksheetToJson(boardMembersSheet) as any[] : [];
    const taskColumnsData = taskColumnsSheet ? worksheetToJson(taskColumnsSheet) as any[] : [];
    const tasksData = tasksSheet ? worksheetToJson(tasksSheet) as any[] : [];
    const taskAssigneesData = taskAssigneesSheet ? worksheetToJson(taskAssigneesSheet) as any[] : [];
    const taskLabelsData = taskLabelsSheet ? worksheetToJson(taskLabelsSheet) as any[] : [];
    const labelAssignmentsData = labelAssignmentsSheet ? worksheetToJson(labelAssignmentsSheet) as any[] : [];
    const checklistItemsData = checklistItemsSheet ? worksheetToJson(checklistItemsSheet) as any[] : [];
    const taskCommentsData = taskCommentsSheet ? worksheetToJson(taskCommentsSheet) as any[] : [];
    const taskAttachmentsData = taskAttachmentsSheet ? worksheetToJson(taskAttachmentsSheet) as any[] : [];
    const taskHistoryData = taskHistorySheet ? worksheetToJson(taskHistorySheet) as any[] : [];

    // Purchase Request Data
    const purchaseRequestsData = purchaseRequestsSheet ? worksheetToJson(purchaseRequestsSheet) as any[] : [];
    const prItemsData = prItemsSheet ? worksheetToJson(prItemsSheet) as any[] : [];
    const prHistoryData = prHistorySheet ? worksheetToJson(prHistorySheet) as any[] : [];

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
      hrProfiles: 0,
      profileChangeRequests: 0,
      boards: 0,
      boardMembers: 0,
      taskColumns: 0,
      tasks: 0,
      taskAssignees: 0,
      taskLabels: 0,
      taskLabelAssignments: 0,
      checklistItems: 0,
      taskComments: 0,
      taskAttachments: 0,
      taskHistory: 0,
      purchaseRequests: 0,
      purchaseRequestItems: 0,
      purchaseRequestHistory: 0,
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

    // Import HR Profiles
    console.log(`Importing ${hrProfilesData.length} HR profiles...`);
    for (const hrData of hrProfilesData) {
      try {
        await prisma.hRProfile.upsert({
          where: { id: hrData.id },
          create: {
            id: hrData.id,
            userId: hrData.userId,
            dateOfBirth: parseDate(hrData.dateOfBirth),
            gender: hrData.gender || null,
            maritalStatus: hrData.maritalStatus || null,
            nationality: hrData.nationality || null,
            qatarMobile: hrData.qatarMobile || null,
            otherMobileCode: hrData.otherMobileCode || null,
            otherMobileNumber: hrData.otherMobileNumber || null,
            personalEmail: hrData.personalEmail || null,
            qidNumber: hrData.qidNumber || null,
            qidExpiry: parseDate(hrData.qidExpiry),
            passportNumber: hrData.passportNumber || null,
            passportExpiry: parseDate(hrData.passportExpiry),
            healthCardExpiry: parseDate(hrData.healthCardExpiry),
            sponsorshipType: hrData.sponsorshipType || null,
            employeeId: hrData.employeeId || null,
            designation: hrData.designation || null,
            dateOfJoining: parseDate(hrData.dateOfJoining),
            bankName: hrData.bankName || null,
            iban: hrData.iban || null,
            highestQualification: hrData.highestQualification || null,
            specialization: hrData.specialization || null,
            institutionName: hrData.institutionName || null,
            graduationYear: hrData.graduationYear ? parseInt(hrData.graduationYear) : null,
            hasDrivingLicense: hrData.hasDrivingLicense === 'Yes',
            licenseExpiry: parseDate(hrData.licenseExpiry),
            onboardingStep: hrData.onboardingStep ? parseInt(hrData.onboardingStep) : 0,
            onboardingComplete: hrData.onboardingComplete === 'Yes',
            createdAt: parseDate(hrData.createdAt) || new Date(),
            updatedAt: parseDate(hrData.updatedAt) || new Date(),
          },
          update: {
            dateOfBirth: parseDate(hrData.dateOfBirth),
            gender: hrData.gender || null,
            maritalStatus: hrData.maritalStatus || null,
            nationality: hrData.nationality || null,
            qatarMobile: hrData.qatarMobile || null,
            otherMobileCode: hrData.otherMobileCode || null,
            otherMobileNumber: hrData.otherMobileNumber || null,
            personalEmail: hrData.personalEmail || null,
            qidNumber: hrData.qidNumber || null,
            qidExpiry: parseDate(hrData.qidExpiry),
            passportNumber: hrData.passportNumber || null,
            passportExpiry: parseDate(hrData.passportExpiry),
            healthCardExpiry: parseDate(hrData.healthCardExpiry),
            sponsorshipType: hrData.sponsorshipType || null,
            employeeId: hrData.employeeId || null,
            designation: hrData.designation || null,
            dateOfJoining: parseDate(hrData.dateOfJoining),
            bankName: hrData.bankName || null,
            iban: hrData.iban || null,
            highestQualification: hrData.highestQualification || null,
            specialization: hrData.specialization || null,
            institutionName: hrData.institutionName || null,
            graduationYear: hrData.graduationYear ? parseInt(hrData.graduationYear) : null,
            hasDrivingLicense: hrData.hasDrivingLicense === 'Yes',
            licenseExpiry: parseDate(hrData.licenseExpiry),
            onboardingStep: hrData.onboardingStep ? parseInt(hrData.onboardingStep) : 0,
            onboardingComplete: hrData.onboardingComplete === 'Yes',
            updatedAt: parseDate(hrData.updatedAt) || new Date(),
          },
        });
        importedCounts.hrProfiles++;
      } catch (error) {
        console.error(`Error importing HR profile ${hrData.id}:`, error);
      }
    }

    // Import Profile Change Requests
    console.log(`Importing ${profileChangesData.length} profile change requests...`);
    for (const changeData of profileChangesData) {
      try {
        await prisma.profileChangeRequest.create({
          data: {
            id: changeData.id,
            hrProfileId: changeData.hrProfileId,
            description: changeData.description,
            status: changeData.status,
            resolvedById: changeData.resolvedById || null,
            resolvedAt: parseDate(changeData.resolvedAt),
            resolverNotes: changeData.resolverNotes || null,
            createdAt: parseDate(changeData.createdAt) || new Date(),
            updatedAt: parseDate(changeData.updatedAt) || new Date(),
          },
        });
        importedCounts.profileChangeRequests++;
      } catch (error) {
        console.error(`Error importing profile change request ${changeData.id}:`, error);
      }
    }

    // Import Task Management - Boards
    console.log(`Importing ${boardsData.length} boards...`);
    for (const boardData of boardsData) {
      try {
        await prisma.board.upsert({
          where: { id: boardData.id },
          create: {
            id: boardData.id,
            title: boardData.title,
            description: boardData.description || null,
            ownerId: boardData.ownerId,
            isArchived: boardData.isArchived === 'Yes',
            createdAt: parseDate(boardData.createdAt) || new Date(),
            updatedAt: parseDate(boardData.updatedAt) || new Date(),
          },
          update: {
            title: boardData.title,
            description: boardData.description || null,
            isArchived: boardData.isArchived === 'Yes',
            updatedAt: parseDate(boardData.updatedAt) || new Date(),
          },
        });
        importedCounts.boards++;
      } catch (error) {
        console.error(`Error importing board ${boardData.id}:`, error);
      }
    }

    // Import Task Management - Board Members
    console.log(`Importing ${boardMembersData.length} board members...`);
    for (const memberData of boardMembersData) {
      try {
        await prisma.boardMember.create({
          data: {
            id: memberData.id,
            boardId: memberData.boardId,
            userId: memberData.userId,
            role: memberData.role,
            joinedAt: parseDate(memberData.joinedAt) || new Date(),
          },
        });
        importedCounts.boardMembers++;
      } catch (error) {
        console.error(`Error importing board member ${memberData.id}:`, error);
      }
    }

    // Import Task Management - Task Labels (before columns/tasks as they may be referenced)
    console.log(`Importing ${taskLabelsData.length} task labels...`);
    for (const labelData of taskLabelsData) {
      try {
        await prisma.taskLabel.create({
          data: {
            id: labelData.id,
            boardId: labelData.boardId,
            name: labelData.name,
            color: labelData.color || '#3b82f6',
            createdAt: parseDate(labelData.createdAt) || new Date(),
          },
        });
        importedCounts.taskLabels++;
      } catch (error) {
        console.error(`Error importing task label ${labelData.id}:`, error);
      }
    }

    // Import Task Management - Task Columns
    console.log(`Importing ${taskColumnsData.length} task columns...`);
    for (const columnData of taskColumnsData) {
      try {
        await prisma.taskColumn.create({
          data: {
            id: columnData.id,
            boardId: columnData.boardId,
            title: columnData.title,
            position: columnData.position ? parseInt(columnData.position) : 0,
            createdAt: parseDate(columnData.createdAt) || new Date(),
            updatedAt: parseDate(columnData.updatedAt) || new Date(),
          },
        });
        importedCounts.taskColumns++;
      } catch (error) {
        console.error(`Error importing task column ${columnData.id}:`, error);
      }
    }

    // Import Task Management - Tasks
    console.log(`Importing ${tasksData.length} tasks...`);
    for (const taskData of tasksData) {
      try {
        await prisma.task.create({
          data: {
            id: taskData.id,
            columnId: taskData.columnId,
            title: taskData.title,
            description: taskData.description || null,
            position: taskData.position ? parseInt(taskData.position) : 0,
            priority: taskData.priority || 'MEDIUM',
            dueDate: parseDate(taskData.dueDate),
            isCompleted: taskData.isCompleted === 'Yes',
            completedAt: parseDate(taskData.completedAt),
            createdById: taskData.createdById,
            createdAt: parseDate(taskData.createdAt) || new Date(),
            updatedAt: parseDate(taskData.updatedAt) || new Date(),
          },
        });
        importedCounts.tasks++;
      } catch (error) {
        console.error(`Error importing task ${taskData.id}:`, error);
      }
    }

    // Import Task Management - Task Assignees
    console.log(`Importing ${taskAssigneesData.length} task assignees...`);
    for (const assigneeData of taskAssigneesData) {
      try {
        await prisma.taskAssignee.create({
          data: {
            id: assigneeData.id,
            taskId: assigneeData.taskId,
            userId: assigneeData.userId,
            assignedAt: parseDate(assigneeData.assignedAt) || new Date(),
            assignedBy: assigneeData.assignedBy || null,
          },
        });
        importedCounts.taskAssignees++;
      } catch (error) {
        console.error(`Error importing task assignee ${assigneeData.id}:`, error);
      }
    }

    // Import Task Management - Task Label Assignments
    console.log(`Importing ${labelAssignmentsData.length} label assignments...`);
    for (const assignmentData of labelAssignmentsData) {
      try {
        await prisma.taskLabelAssignment.create({
          data: {
            id: assignmentData.id,
            taskId: assignmentData.taskId,
            labelId: assignmentData.labelId,
          },
        });
        importedCounts.taskLabelAssignments++;
      } catch (error) {
        console.error(`Error importing label assignment ${assignmentData.id}:`, error);
      }
    }

    // Import Task Management - Checklist Items
    console.log(`Importing ${checklistItemsData.length} checklist items...`);
    for (const checklistData of checklistItemsData) {
      try {
        await prisma.checklistItem.create({
          data: {
            id: checklistData.id,
            taskId: checklistData.taskId,
            title: checklistData.title,
            isCompleted: checklistData.isCompleted === 'Yes',
            position: checklistData.position ? parseInt(checklistData.position) : 0,
            completedAt: parseDate(checklistData.completedAt),
            completedBy: checklistData.completedBy || null,
            createdAt: parseDate(checklistData.createdAt) || new Date(),
            updatedAt: parseDate(checklistData.updatedAt) || new Date(),
          },
        });
        importedCounts.checklistItems++;
      } catch (error) {
        console.error(`Error importing checklist item ${checklistData.id}:`, error);
      }
    }

    // Import Task Management - Task Comments
    console.log(`Importing ${taskCommentsData.length} task comments...`);
    for (const commentData of taskCommentsData) {
      try {
        await prisma.taskComment.create({
          data: {
            id: commentData.id,
            taskId: commentData.taskId,
            content: commentData.content,
            authorId: commentData.authorId,
            createdAt: parseDate(commentData.createdAt) || new Date(),
            updatedAt: parseDate(commentData.updatedAt) || new Date(),
          },
        });
        importedCounts.taskComments++;
      } catch (error) {
        console.error(`Error importing task comment ${commentData.id}:`, error);
      }
    }

    // Import Task Management - Task Attachments
    console.log(`Importing ${taskAttachmentsData.length} task attachments...`);
    for (const attachmentData of taskAttachmentsData) {
      try {
        await prisma.taskAttachment.create({
          data: {
            id: attachmentData.id,
            taskId: attachmentData.taskId,
            fileName: attachmentData.fileName,
            fileSize: attachmentData.fileSize ? parseInt(attachmentData.fileSize) : 0,
            mimeType: attachmentData.mimeType,
            storagePath: attachmentData.storagePath,
            uploadedById: attachmentData.uploadedById,
            createdAt: parseDate(attachmentData.createdAt) || new Date(),
          },
        });
        importedCounts.taskAttachments++;
      } catch (error) {
        console.error(`Error importing task attachment ${attachmentData.id}:`, error);
      }
    }

    // Import Task Management - Task History
    console.log(`Importing ${taskHistoryData.length} task history records...`);
    for (const historyData of taskHistoryData) {
      try {
        await prisma.taskHistory.create({
          data: {
            id: historyData.id,
            taskId: historyData.taskId,
            action: historyData.action,
            changes: historyData.changes ? JSON.parse(historyData.changes) : null,
            performedById: historyData.performedById,
            createdAt: parseDate(historyData.createdAt) || new Date(),
          },
        });
        importedCounts.taskHistory++;
      } catch (error) {
        console.error(`Error importing task history ${historyData.id}:`, error);
      }
    }

    // Import Purchase Requests
    console.log(`Importing ${purchaseRequestsData.length} purchase requests...`);
    for (const prData of purchaseRequestsData) {
      try {
        await prisma.purchaseRequest.upsert({
          where: { id: prData.id },
          create: {
            id: prData.id,
            referenceNumber: prData.referenceNumber,
            requestDate: parseDate(prData.requestDate) || new Date(),
            status: prData.status || 'PENDING',
            priority: prData.priority || 'MEDIUM',
            requesterId: prData.requesterId,
            title: prData.title,
            description: prData.description || null,
            justification: prData.justification || null,
            neededByDate: parseDate(prData.neededByDate),
            totalAmount: prData.totalAmount ? String(prData.totalAmount) : '0',
            currency: prData.currency || 'QAR',
            totalAmountQAR: prData.totalAmountQAR ? String(prData.totalAmountQAR) : null,
            reviewedById: prData.reviewedById || null,
            reviewedAt: parseDate(prData.reviewedAt),
            reviewNotes: prData.reviewNotes || null,
            completedAt: parseDate(prData.completedAt),
            completionNotes: prData.completionNotes || null,
            createdAt: parseDate(prData.createdAt) || new Date(),
            updatedAt: parseDate(prData.updatedAt) || new Date(),
          },
          update: {
            referenceNumber: prData.referenceNumber,
            requestDate: parseDate(prData.requestDate) || new Date(),
            status: prData.status || 'PENDING',
            priority: prData.priority || 'MEDIUM',
            title: prData.title,
            description: prData.description || null,
            justification: prData.justification || null,
            neededByDate: parseDate(prData.neededByDate),
            totalAmount: prData.totalAmount ? String(prData.totalAmount) : '0',
            currency: prData.currency || 'QAR',
            totalAmountQAR: prData.totalAmountQAR ? String(prData.totalAmountQAR) : null,
            reviewedById: prData.reviewedById || null,
            reviewedAt: parseDate(prData.reviewedAt),
            reviewNotes: prData.reviewNotes || null,
            completedAt: parseDate(prData.completedAt),
            completionNotes: prData.completionNotes || null,
            updatedAt: parseDate(prData.updatedAt) || new Date(),
          },
        });
        importedCounts.purchaseRequests++;
      } catch (error) {
        console.error(`Error importing purchase request ${prData.id}:`, error);
      }
    }

    // Import Purchase Request Items
    console.log(`Importing ${prItemsData.length} purchase request items...`);
    for (const itemData of prItemsData) {
      try {
        await prisma.purchaseRequestItem.create({
          data: {
            id: itemData.id,
            purchaseRequestId: itemData.purchaseRequestId,
            itemNumber: itemData.itemNumber ? parseInt(itemData.itemNumber) : 1,
            description: itemData.description,
            quantity: itemData.quantity ? parseInt(itemData.quantity) : 1,
            unitPrice: itemData.unitPrice ? String(itemData.unitPrice) : '0',
            currency: itemData.currency || 'QAR',
            unitPriceQAR: itemData.unitPriceQAR ? String(itemData.unitPriceQAR) : null,
            totalPrice: itemData.totalPrice ? String(itemData.totalPrice) : '0',
            totalPriceQAR: itemData.totalPriceQAR ? String(itemData.totalPriceQAR) : null,
            category: itemData.category || null,
            supplier: itemData.supplier || null,
            notes: itemData.notes || null,
            createdAt: parseDate(itemData.createdAt) || new Date(),
            updatedAt: parseDate(itemData.updatedAt) || new Date(),
          },
        });
        importedCounts.purchaseRequestItems++;
      } catch (error) {
        console.error(`Error importing purchase request item ${itemData.id}:`, error);
      }
    }

    // Import Purchase Request History
    console.log(`Importing ${prHistoryData.length} purchase request history records...`);
    for (const historyData of prHistoryData) {
      try {
        await prisma.purchaseRequestHistory.create({
          data: {
            id: historyData.id,
            purchaseRequestId: historyData.purchaseRequestId,
            action: historyData.action,
            previousStatus: historyData.previousStatus || null,
            newStatus: historyData.newStatus || null,
            performedById: historyData.performedById,
            details: historyData.details || null,
            createdAt: parseDate(historyData.createdAt) || new Date(),
          },
        });
        importedCounts.purchaseRequestHistory++;
      } catch (error) {
        console.error(`Error importing purchase request history ${historyData.id}:`, error);
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
