import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data from all tables
    const [
      users,
      assets,
      assetHistory,
      maintenanceRecords,
      subscriptions,
      subscriptionHistory,
      activityLogs,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          role: true,
          isTemporaryStaff: true,
          isSystemAccount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.asset.findMany({
        include: {
          assignedUser: { select: { email: true, name: true } },
        },
      }),
      prisma.assetHistory.findMany({
        include: {
          asset: { select: { assetTag: true, model: true } },
          fromUser: { select: { email: true, name: true } },
          toUser: { select: { email: true, name: true } },
          performer: { select: { email: true, name: true } },
        },
      }),
      prisma.maintenanceRecord.findMany({
        include: {
          asset: { select: { assetTag: true, model: true } },
        },
      }),
      prisma.subscription.findMany({
        include: {
          assignedUser: { select: { email: true, name: true } },
        },
      }),
      prisma.subscriptionHistory.findMany({
        include: {
          subscription: { select: { serviceName: true } },
          oldUser: { select: { email: true, name: true } },
          newUser: { select: { email: true, name: true } },
          performer: { select: { email: true, name: true } },
        },
      }),
      prisma.activityLog.findMany({
        include: {
          actorUser: { select: { email: true, name: true } },
        },
      }),
    ]);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Asset Management System';
    workbook.created = new Date();

    // Helper to format dates consistently
    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // 1. Users Sheet
    const usersSheet = workbook.addWorksheet('Users');
    usersSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Email Verified', key: 'emailVerified', width: 20 },
      { header: 'Image', key: 'image', width: 50 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Is Temporary Staff', key: 'isTemporaryStaff', width: 20 },
      { header: 'Is System Account', key: 'isSystemAccount', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    users.forEach(user => {
      usersSheet.addRow({
        id: user.id,
        name: user.name || '',
        email: user.email,
        emailVerified: formatDate(user.emailVerified),
        image: user.image || '',
        role: user.role,
        isTemporaryStaff: user.isTemporaryStaff ? 'Yes' : 'No',
        isSystemAccount: user.isSystemAccount ? 'Yes' : 'No',
        createdAt: formatDate(user.createdAt),
        updatedAt: formatDate(user.updatedAt),
      });
    });

    // 2. Assets Sheet
    const assetsSheet = workbook.addWorksheet('Assets');
    assetsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Asset Tag', key: 'assetTag', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Model', key: 'model', width: 25 },
      { header: 'Serial', key: 'serial', width: 25 },
      { header: 'Configuration', key: 'configuration', width: 30 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 20 },
      { header: 'Warranty Expiry', key: 'warrantyExpiry', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 25 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 25 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Price Currency', key: 'priceCurrency', width: 15 },
      { header: 'Price USD', key: 'priceQAR', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Acquisition Type', key: 'acquisitionType', width: 20 },
      { header: 'Transfer Notes', key: 'transferNotes', width: 30 },
      { header: 'Assigned User ID', key: 'assignedUserId', width: 30 },
      { header: 'Assigned User Email', key: 'assignedUserEmail', width: 30 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    assets.forEach(asset => {
      assetsSheet.addRow({
        id: asset.id,
        assetTag: asset.assetTag || '',
        type: asset.type,
        category: asset.category || '',
        brand: asset.brand || '',
        model: asset.model,
        serial: asset.serial || '',
        configuration: asset.configuration || '',
        purchaseDate: formatDate(asset.purchaseDate),
        warrantyExpiry: formatDate(asset.warrantyExpiry),
        supplier: asset.supplier || '',
        invoiceNumber: asset.invoiceNumber || '',
        price: asset.price ? Number(asset.price) : '',
        priceCurrency: asset.priceCurrency || '',
        priceQAR: asset.priceQAR ? Number(asset.priceQAR) : '',
        status: asset.status,
        acquisitionType: asset.acquisitionType,
        transferNotes: asset.transferNotes || '',
        assignedUserId: asset.assignedUserId || '',
        assignedUserEmail: asset.assignedUser?.email || '',
        notes: asset.notes || '',
        createdAt: formatDate(asset.createdAt),
        updatedAt: formatDate(asset.updatedAt),
      });
    });

    // 3. Asset History Sheet
    const assetHistorySheet = workbook.addWorksheet('Asset History');
    assetHistorySheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Asset ID', key: 'assetId', width: 30 },
      { header: 'Asset Tag', key: 'assetTag', width: 20 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'From User ID', key: 'fromUserId', width: 30 },
      { header: 'From User Email', key: 'fromUserEmail', width: 30 },
      { header: 'To User ID', key: 'toUserId', width: 30 },
      { header: 'To User Email', key: 'toUserEmail', width: 30 },
      { header: 'From Status', key: 'fromStatus', width: 15 },
      { header: 'To Status', key: 'toStatus', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Performed By ID', key: 'performedBy', width: 30 },
      { header: 'Performer Email', key: 'performerEmail', width: 30 },
      { header: 'Assignment Date', key: 'assignmentDate', width: 20 },
      { header: 'Return Date', key: 'returnDate', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    assetHistory.forEach(history => {
      assetHistorySheet.addRow({
        id: history.id,
        assetId: history.assetId,
        assetTag: history.asset.assetTag || '',
        action: history.action,
        fromUserId: history.fromUserId || '',
        fromUserEmail: history.fromUser?.email || '',
        toUserId: history.toUserId || '',
        toUserEmail: history.toUser?.email || '',
        fromStatus: history.fromStatus || '',
        toStatus: history.toStatus || '',
        notes: history.notes || '',
        performedBy: history.performedBy || '',
        performerEmail: history.performer?.email || '',
        assignmentDate: formatDate(history.assignmentDate),
        returnDate: formatDate(history.returnDate),
        createdAt: formatDate(history.createdAt),
      });
    });

    // 4. Maintenance Records Sheet
    const maintenanceSheet = workbook.addWorksheet('Maintenance Records');
    maintenanceSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Asset ID', key: 'assetId', width: 30 },
      { header: 'Asset Tag', key: 'assetTag', width: 20 },
      { header: 'Maintenance Date', key: 'maintenanceDate', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Performed By', key: 'performedBy', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    maintenanceRecords.forEach(record => {
      maintenanceSheet.addRow({
        id: record.id,
        assetId: record.assetId,
        assetTag: record.asset.assetTag || '',
        maintenanceDate: formatDate(record.maintenanceDate),
        notes: record.notes || '',
        performedBy: record.performedBy || '',
        createdAt: formatDate(record.createdAt),
        updatedAt: formatDate(record.updatedAt),
      });
    });

    // 5. Subscriptions Sheet
    const subscriptionsSheet = workbook.addWorksheet('Subscriptions');
    subscriptionsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Service Name', key: 'serviceName', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Account ID', key: 'accountId', width: 25 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 20 },
      { header: 'Renewal Date', key: 'renewalDate', width: 20 },
      { header: 'Billing Cycle', key: 'billingCycle', width: 15 },
      { header: 'Cost Per Cycle', key: 'costPerCycle', width: 15 },
      { header: 'Cost Currency', key: 'costCurrency', width: 15 },
      { header: 'Cost USD', key: 'costQAR', width: 15 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Usage Type', key: 'usageType', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assigned User ID', key: 'assignedUserId', width: 30 },
      { header: 'Assigned User Email', key: 'assignedUserEmail', width: 30 },
      { header: 'Auto Renew', key: 'autoRenew', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Last Active Renewal Date', key: 'lastActiveRenewalDate', width: 25 },
      { header: 'Cancelled At', key: 'cancelledAt', width: 20 },
      { header: 'Reactivated At', key: 'reactivatedAt', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    subscriptions.forEach(subscription => {
      subscriptionsSheet.addRow({
        id: subscription.id,
        serviceName: subscription.serviceName,
        category: subscription.category || '',
        accountId: subscription.accountId || '',
        purchaseDate: formatDate(subscription.purchaseDate),
        renewalDate: formatDate(subscription.renewalDate),
        billingCycle: subscription.billingCycle,
        costPerCycle: subscription.costPerCycle ? Number(subscription.costPerCycle) : '',
        costCurrency: subscription.costCurrency || '',
        costQAR: subscription.costQAR ? Number(subscription.costQAR) : '',
        vendor: subscription.vendor || '',
        usageType: subscription.usageType,
        status: subscription.status,
        assignedUserId: subscription.assignedUserId || '',
        assignedUserEmail: subscription.assignedUser?.email || '',
        autoRenew: subscription.autoRenew ? 'Yes' : 'No',
        paymentMethod: subscription.paymentMethod || '',
        notes: subscription.notes || '',
        lastActiveRenewalDate: formatDate(subscription.lastActiveRenewalDate),
        cancelledAt: formatDate(subscription.cancelledAt),
        reactivatedAt: formatDate(subscription.reactivatedAt),
        createdAt: formatDate(subscription.createdAt),
        updatedAt: formatDate(subscription.updatedAt),
      });
    });

    // 6. Subscription History Sheet
    const subscriptionHistorySheet = workbook.addWorksheet('Subscription History');
    subscriptionHistorySheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Subscription ID', key: 'subscriptionId', width: 30 },
      { header: 'Service Name', key: 'serviceName', width: 30 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Old Status', key: 'oldStatus', width: 15 },
      { header: 'New Status', key: 'newStatus', width: 15 },
      { header: 'Old Renewal Date', key: 'oldRenewalDate', width: 20 },
      { header: 'New Renewal Date', key: 'newRenewalDate', width: 20 },
      { header: 'Assignment Date', key: 'assignmentDate', width: 20 },
      { header: 'Reactivation Date', key: 'reactivationDate', width: 20 },
      { header: 'Old User ID', key: 'oldUserId', width: 30 },
      { header: 'Old User Email', key: 'oldUserEmail', width: 30 },
      { header: 'New User ID', key: 'newUserId', width: 30 },
      { header: 'New User Email', key: 'newUserEmail', width: 30 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Performed By ID', key: 'performedBy', width: 30 },
      { header: 'Performer Email', key: 'performerEmail', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    subscriptionHistory.forEach(history => {
      subscriptionHistorySheet.addRow({
        id: history.id,
        subscriptionId: history.subscriptionId,
        serviceName: history.subscription.serviceName,
        action: history.action,
        oldStatus: history.oldStatus || '',
        newStatus: history.newStatus || '',
        oldRenewalDate: formatDate(history.oldRenewalDate),
        newRenewalDate: formatDate(history.newRenewalDate),
        assignmentDate: formatDate(history.assignmentDate),
        reactivationDate: formatDate(history.reactivationDate),
        oldUserId: history.oldUserId || '',
        oldUserEmail: history.oldUser?.email || '',
        newUserId: history.newUserId || '',
        newUserEmail: history.newUser?.email || '',
        notes: history.notes || '',
        performedBy: history.performedBy || '',
        performerEmail: history.performer?.email || '',
        createdAt: formatDate(history.createdAt),
      });
    });

    // 7. Activity Logs Sheet
    const activityLogsSheet = workbook.addWorksheet('Activity Logs');
    activityLogsSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Actor User ID', key: 'actorUserId', width: 30 },
      { header: 'Actor Email', key: 'actorEmail', width: 30 },
      { header: 'Action', key: 'action', width: 30 },
      { header: 'Entity Type', key: 'entityType', width: 20 },
      { header: 'Entity ID', key: 'entityId', width: 30 },
      { header: 'Payload', key: 'payload', width: 50 },
      { header: 'At', key: 'at', width: 20 },
    ];
    activityLogs.forEach(log => {
      activityLogsSheet.addRow({
        id: log.id,
        actorUserId: log.actorUserId || '',
        actorEmail: log.actorUser?.email || '',
        action: log.action,
        entityType: log.entityType || '',
        entityId: log.entityId || '',
        payload: log.payload ? JSON.stringify(log.payload) : '',
        at: formatDate(log.at),
      });
    });

    // Style header rows
    [
      usersSheet,
      assetsSheet,
      assetHistorySheet,
      maintenanceSheet,
      subscriptionsSheet,
      subscriptionHistorySheet,
      activityLogsSheet,
    ].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    const filename = `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Full backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
