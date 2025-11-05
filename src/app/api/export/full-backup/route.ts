import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { arrayToCSV, formatDateForCSV } from '@/lib/csv-utils';

export const maxDuration = 60; // Set max duration to 60 seconds for large exports

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data from database
    const [
      users,
      assets,
      subscriptions,
      suppliers,
      accreditations,
      projects,
      assetHistory,
      subscriptionHistory,
      supplierEngagements,
      accreditationHistory,
      accreditationScans,
      activityLogs,
      maintenanceRecords,
    ] = await Promise.all([
      prisma.user.findMany({
        include: {
          deletedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.asset.findMany({
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.subscription.findMany({
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.supplier.findMany({
        include: {
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.accreditation.findMany({
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          revokedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.accreditationProject.findMany(),
      prisma.assetHistory.findMany({
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              type: true,
              model: true,
            },
          },
          fromUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          performer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.subscriptionHistory.findMany({
        include: {
          subscription: {
            select: {
              id: true,
              serviceName: true,
            },
          },
          oldUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          newUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          performer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.supplierEngagement.findMany({
        include: {
          supplier: {
            select: {
              id: true,
              suppCode: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.accreditationHistory.findMany({
        include: {
          accreditation: {
            select: {
              id: true,
              accreditationNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.accreditationScan.findMany({
        include: {
          accreditation: {
            select: {
              id: true,
              accreditationNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          scannedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.activityLog.findMany({
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.maintenanceRecord.findMany({
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              type: true,
              model: true,
            },
          },
        },
      }),
    ]);

    // Transform data for Excel sheets
    const usersData = users.map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email,
      role: u.role,
      isTemporaryStaff: u.isTemporaryStaff ? 'Yes' : 'No',
      isSystemAccount: u.isSystemAccount ? 'Yes' : 'No',
      emailVerified: u.emailVerified ? formatDateForCSV(u.emailVerified) : '',
      deletedAt: formatDateForCSV(u.deletedAt),
      deletedBy: u.deletedBy ? (u.deletedBy.name || u.deletedBy.email) : '',
      createdAt: formatDateForCSV(u.createdAt),
      updatedAt: formatDateForCSV(u.updatedAt),
    }));

    const assetsData = assets.map(a => ({
      id: a.id,
      assetTag: a.assetTag || '',
      type: a.type,
      category: a.category || '',
      brand: a.brand || '',
      model: a.model,
      serial: a.serial || '',
      configuration: a.configuration || '',
      purchaseDate: formatDateForCSV(a.purchaseDate),
      warrantyExpiry: formatDateForCSV(a.warrantyExpiry),
      supplier: a.supplier || '',
      invoiceNumber: a.invoiceNumber || '',
      assignedUserId: a.assignedUserId || '',
      assignedUser: a.assignedUser ? (a.assignedUser.name || a.assignedUser.email) : '',
      status: a.status,
      acquisitionType: a.acquisitionType,
      location: a.location || '',
      price: a.price ? Number(a.price) : '',
      priceCurrency: a.priceCurrency || '',
      priceQAR: a.priceQAR ? Number(a.priceQAR) : '',
      notes: a.notes || '',
      createdAt: formatDateForCSV(a.createdAt),
      updatedAt: formatDateForCSV(a.updatedAt),
    }));

    const subscriptionsData = subscriptions.map(s => ({
      id: s.id,
      serviceName: s.serviceName,
      category: s.category || '',
      accountId: s.accountId || '',
      purchaseDate: formatDateForCSV(s.purchaseDate),
      renewalDate: formatDateForCSV(s.renewalDate),
      billingCycle: s.billingCycle,
      costPerCycle: s.costPerCycle ? Number(s.costPerCycle) : '',
      costCurrency: s.costCurrency || '',
      costQAR: s.costQAR ? Number(s.costQAR) : '',
      vendor: s.vendor || '',
      usageType: s.usageType,
      status: s.status,
      assignedUserId: s.assignedUserId || '',
      assignedUser: s.assignedUser ? (s.assignedUser.name || s.assignedUser.email) : '',
      autoRenew: s.autoRenew ? 'Yes' : 'No',
      paymentMethod: s.paymentMethod || '',
      notes: s.notes || '',
      cancelledAt: formatDateForCSV(s.cancelledAt),
      reactivatedAt: formatDateForCSV(s.reactivatedAt),
      lastActiveRenewalDate: formatDateForCSV(s.lastActiveRenewalDate),
      createdAt: formatDateForCSV(s.createdAt),
      updatedAt: formatDateForCSV(s.updatedAt),
    }));

    const suppliersData = suppliers.map(s => ({
      id: s.id,
      suppCode: s.suppCode || '',
      name: s.name,
      category: s.category,
      address: s.address || '',
      city: s.city || '',
      country: s.country || '',
      website: s.website || '',
      establishmentYear: s.establishmentYear || '',
      primaryContactName: s.primaryContactName || '',
      primaryContactTitle: s.primaryContactTitle || '',
      primaryContactEmail: s.primaryContactEmail || '',
      primaryContactMobile: s.primaryContactMobile || '',
      secondaryContactName: s.secondaryContactName || '',
      secondaryContactTitle: s.secondaryContactTitle || '',
      secondaryContactEmail: s.secondaryContactEmail || '',
      secondaryContactMobile: s.secondaryContactMobile || '',
      paymentTerms: s.paymentTerms || '',
      additionalInfo: s.additionalInfo || '',
      status: s.status,
      rejectionReason: s.rejectionReason || '',
      approvedById: s.approvedById || '',
      approvedBy: s.approvedBy ? (s.approvedBy.name || s.approvedBy.email) : '',
      approvedAt: formatDateForCSV(s.approvedAt),
      createdAt: formatDateForCSV(s.createdAt),
      updatedAt: formatDateForCSV(s.updatedAt),
    }));

    const accreditationsData = accreditations.map(a => ({
      id: a.id,
      accreditationNumber: a.accreditationNumber,
      projectId: a.projectId,
      projectCode: a.project?.code || '',
      projectName: a.project?.name || '',
      firstName: a.firstName,
      lastName: a.lastName,
      organization: a.organization,
      jobTitle: a.jobTitle,
      accessGroup: a.accessGroup,
      profilePhotoUrl: a.profilePhotoUrl || '',
      qidNumber: a.qidNumber || '',
      qidExpiry: formatDateForCSV(a.qidExpiry),
      passportNumber: a.passportNumber || '',
      passportCountry: a.passportCountry || '',
      passportExpiry: formatDateForCSV(a.passportExpiry),
      hayyaVisaNumber: a.hayyaVisaNumber || '',
      hayyaVisaExpiry: formatDateForCSV(a.hayyaVisaExpiry),
      hasBumpInAccess: a.hasBumpInAccess ? 'Yes' : 'No',
      bumpInStart: formatDateForCSV(a.bumpInStart),
      bumpInEnd: formatDateForCSV(a.bumpInEnd),
      hasLiveAccess: a.hasLiveAccess ? 'Yes' : 'No',
      liveStart: formatDateForCSV(a.liveStart),
      liveEnd: formatDateForCSV(a.liveEnd),
      hasBumpOutAccess: a.hasBumpOutAccess ? 'Yes' : 'No',
      bumpOutStart: formatDateForCSV(a.bumpOutStart),
      bumpOutEnd: formatDateForCSV(a.bumpOutEnd),
      status: a.status,
      qrCodeToken: a.qrCodeToken || '',
      createdById: a.createdById,
      createdBy: a.createdBy ? (a.createdBy.name || a.createdBy.email) : '',
      approvedById: a.approvedById || '',
      approvedBy: a.approvedBy ? (a.approvedBy.name || a.approvedBy.email) : '',
      approvedAt: formatDateForCSV(a.approvedAt),
      revokedById: a.revokedById || '',
      revokedBy: a.revokedBy ? (a.revokedBy.name || a.revokedBy.email) : '',
      revokedAt: formatDateForCSV(a.revokedAt),
      revocationReason: a.revocationReason || '',
      createdAt: formatDateForCSV(a.createdAt),
      updatedAt: formatDateForCSV(a.updatedAt),
    }));

    const projectsData = projects.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code || '',
      bumpInStart: formatDateForCSV(p.bumpInStart),
      bumpInEnd: formatDateForCSV(p.bumpInEnd),
      liveStart: formatDateForCSV(p.liveStart),
      liveEnd: formatDateForCSV(p.liveEnd),
      bumpOutStart: formatDateForCSV(p.bumpOutStart),
      bumpOutEnd: formatDateForCSV(p.bumpOutEnd),
      accessGroups: JSON.stringify(p.accessGroups),
      isActive: p.isActive ? 'Yes' : 'No',
      createdAt: formatDateForCSV(p.createdAt),
      updatedAt: formatDateForCSV(p.updatedAt),
    }));

    // Asset History
    const assetHistoryData = assetHistory.map(h => ({
      id: h.id,
      assetId: h.assetId,
      assetTag: h.asset?.assetTag || '',
      assetType: h.asset?.type || '',
      assetModel: h.asset?.model || '',
      action: h.action,
      fromUserId: h.fromUserId || '',
      fromUserName: h.fromUser ? (h.fromUser.name || h.fromUser.email) : '',
      toUserId: h.toUserId || '',
      toUserName: h.toUser ? (h.toUser.name || h.toUser.email) : '',
      performedBy: h.performedBy || '',
      performerName: h.performer ? (h.performer.name || h.performer.email) : '',
      notes: h.notes || '',
      createdAt: formatDateForCSV(h.createdAt),
    }));

    // Subscription History
    const subscriptionHistoryData = subscriptionHistory.map(h => ({
      id: h.id,
      subscriptionId: h.subscriptionId,
      subscriptionName: h.subscription?.serviceName || '',
      action: h.action,
      oldStatus: h.oldStatus || '',
      newStatus: h.newStatus || '',
      oldRenewalDate: formatDateForCSV(h.oldRenewalDate),
      newRenewalDate: formatDateForCSV(h.newRenewalDate),
      oldUserId: h.oldUserId || '',
      oldUserName: h.oldUser ? (h.oldUser.name || h.oldUser.email) : '',
      newUserId: h.newUserId || '',
      newUserName: h.newUser ? (h.newUser.name || h.newUser.email) : '',
      assignmentDate: formatDateForCSV(h.assignmentDate),
      reactivationDate: formatDateForCSV(h.reactivationDate),
      notes: h.notes || '',
      performedBy: h.performedBy || '',
      performerName: h.performer ? (h.performer.name || h.performer.email) : '',
      createdAt: formatDateForCSV(h.createdAt),
    }));

    // Supplier Engagements
    const supplierEngagementsData = supplierEngagements.map(e => ({
      id: e.id,
      supplierId: e.supplierId,
      supplierCode: e.supplier?.suppCode || '',
      supplierName: e.supplier?.name || '',
      date: formatDateForCSV(e.date),
      rating: e.rating || '',
      notes: e.notes || '',
      createdById: e.createdById,
      createdByName: e.createdBy ? (e.createdBy.name || e.createdBy.email) : '',
      createdAt: formatDateForCSV(e.createdAt),
    }));

    // Accreditation History
    const accreditationHistoryData = accreditationHistory.map(h => ({
      id: h.id,
      accreditationId: h.accreditationId,
      accreditationNumber: h.accreditation?.accreditationNumber || '',
      accreditationName: h.accreditation ? `${h.accreditation.firstName} ${h.accreditation.lastName}` : '',
      action: h.action,
      oldStatus: h.oldStatus || '',
      newStatus: h.newStatus || '',
      notes: h.notes || '',
      performedBy: h.performedBy?.id || '',
      performedByName: h.performedBy ? (h.performedBy.name || h.performedBy.email) : '',
      createdAt: formatDateForCSV(h.createdAt),
    }));

    // Accreditation Scans
    const accreditationScansData = accreditationScans.map(s => ({
      id: s.id,
      accreditationId: s.accreditationId,
      accreditationNumber: s.accreditation?.accreditationNumber || '',
      accreditationName: s.accreditation ? `${s.accreditation.firstName} ${s.accreditation.lastName}` : '',
      scanLocation: s.location || '',
      notes: s.notes || '',
      scannedById: s.scannedById,
      scannedByName: s.scannedBy ? (s.scannedBy.name || s.scannedBy.email) : '',
      scannedAt: formatDateForCSV(s.scannedAt),
    }));

    // Activity Logs
    const activityLogsData = activityLogs.map(l => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      actorUserId: l.actorUserId || '',
      actorUserName: l.actorUser ? (l.actorUser.name || l.actorUser.email) : 'System',
      payload: JSON.stringify(l.payload || {}),
      timestamp: formatDateForCSV(l.at),
    }));

    // Maintenance Records
    const maintenanceRecordsData = maintenanceRecords.map(m => ({
      id: m.id,
      assetId: m.assetId,
      assetTag: m.asset?.assetTag || '',
      assetType: m.asset?.type || '',
      assetModel: m.asset?.model || '',
      maintenanceDate: formatDateForCSV(m.maintenanceDate),
      performedBy: m.performedBy || '',
      notes: m.notes || '',
      createdAt: formatDateForCSV(m.createdAt),
      updatedAt: formatDateForCSV(m.updatedAt),
    }));

    // Metadata sheet
    const metadataData = [{
      exportDate: new Date().toISOString(),
      exportedBy: session.user.email,
      version: '3.0',
      totalUsers: users.length,
      totalAssets: assets.length,
      totalSubscriptions: subscriptions.length,
      totalSuppliers: suppliers.length,
      totalAccreditations: accreditations.length,
      totalProjects: projects.length,
      totalAssetHistory: assetHistory.length,
      totalSubscriptionHistory: subscriptionHistory.length,
      totalSupplierEngagements: supplierEngagements.length,
      totalAccreditationHistory: accreditationHistory.length,
      totalAccreditationScans: accreditationScans.length,
      totalActivityLogs: activityLogs.length,
      totalMaintenanceRecords: maintenanceRecords.length,
    }];

    // Create Excel file with multiple sheets - ALL data included
    const sheets = [
      { name: 'Metadata', data: metadataData, headers: Object.keys(metadataData[0]).map(key => ({ key, header: key })) },
      { name: 'Users', data: usersData, headers: Object.keys(usersData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Assets', data: assetsData, headers: Object.keys(assetsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Subscriptions', data: subscriptionsData, headers: Object.keys(subscriptionsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Suppliers', data: suppliersData, headers: Object.keys(suppliersData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Accreditations', data: accreditationsData, headers: Object.keys(accreditationsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Projects', data: projectsData, headers: Object.keys(projectsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Asset History', data: assetHistoryData, headers: Object.keys(assetHistoryData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Subscription History', data: subscriptionHistoryData, headers: Object.keys(subscriptionHistoryData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Supplier Engagements', data: supplierEngagementsData, headers: Object.keys(supplierEngagementsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Accreditation History', data: accreditationHistoryData, headers: Object.keys(accreditationHistoryData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Accreditation Scans', data: accreditationScansData, headers: Object.keys(accreditationScansData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Activity Logs', data: activityLogsData, headers: Object.keys(activityLogsData[0] || {}).map(key => ({ key, header: key })) },
      { name: 'Maintenance Records', data: maintenanceRecordsData, headers: Object.keys(maintenanceRecordsData[0] || {}).map(key => ({ key, header: key })) },
    ];

    const excelBuffer = await arrayToCSV([], [], sheets);
    const filename = `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Full backup export error:', error);
    return NextResponse.json(
      { error: 'Failed to create full backup' },
      { status: 500 }
    );
  }
}
