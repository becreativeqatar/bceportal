import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { csvToArray } from '@/lib/csv-utils';
import { logAction, ActivityActions } from '@/lib/activity';
import { BillingCycle, UsageType } from '@prisma/client';

interface ImportRow {
  'ID'?: string;
  'Service Name': string;
  'Category'?: string;
  'Account ID/Email'?: string;
  'Vendor'?: string;
  'Purchase Date (dd/mm/yyyy)'?: string;
  'Renewal Date (dd/mm/yyyy)'?: string;
  'Billing Cycle': string;
  'Cost Per Cycle'?: string;
  'Cost Currency'?: string;
  'Cost USD'?: string;
  'Status'?: string;
  'Usage Type'?: string;
  'Auto Renew'?: string;
  'Payment Method'?: string;
  'Notes'?: string;
  'Project Name'?: string;
  'Project Code'?: string;
  'Assigned User Name'?: string;
  'Assigned User Email'?: string;
  'Cancelled At (dd/mm/yyyy)'?: string;
  'Reactivated At (dd/mm/yyyy)'?: string;
  'Last Active Renewal Date (dd/mm/yyyy)'?: string;
  'Created At (dd/mm/yyyy)'?: string;
  'Updated At (dd/mm/yyyy)'?: string;
}

interface HistoryImportRow {
  'Subscription ID': string;
  'Subscription Name'?: string;
  'Action': string;
  'Old Status'?: string;
  'New Status'?: string;
  'Old Renewal Date (dd/mm/yyyy)'?: string;
  'New Renewal Date (dd/mm/yyyy)'?: string;
  'Assignment Date (dd/mm/yyyy)'?: string;
  'Reactivation Date (dd/mm/yyyy)'?: string;
  'Notes'?: string;
  'Performed By'?: string;
  'Created At (dd/mm/yyyy)'?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file from request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse CSV - Get subscriptions from first sheet
    const rows = await csvToArray<ImportRow>(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    // Try to parse history from second sheet (if exists)
    let historyRows: HistoryImportRow[] = [];
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const historySheet = workbook.getWorksheet('Subscription History');
      if (historySheet) {
        const historyData: HistoryImportRow[] = [];
        const headers: string[] = [];

        historySheet.eachRow((row: any, rowNumber: number) => {
          if (rowNumber === 1) {
            row.eachCell((cell: any, colNumber: number) => {
              headers[colNumber - 1] = cell.value?.toString() || '';
            });
          } else {
            const rowData: Record<string, any> = {};
            row.eachCell((cell: any, colNumber: number) => {
              const header = headers[colNumber - 1];
              rowData[header] = cell.value?.toString() || '';
            });
            if (Object.values(rowData).some(v => v !== null && v !== '')) {
              historyData.push(rowData as HistoryImportRow);
            }
          }
        });
        historyRows = historyData;
      }
    } catch (err) {
      console.log('No history sheet found or error parsing it:', err);
    }

    const results: {
      success: number;
      failed: number;
      errors: { row: number; error: string; data: unknown }[];
      created: { serviceName: string; billingCycle: string; costPerCycle: number | null }[];
    } = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    // Map old subscription IDs to new ones (for history import)
    const idMap = new Map<string, string>();

    // Process each row with transaction protection
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because Excel starts at 1 and we have headers

      try {
        // Validate required fields
        if (!row['Service Name']) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required field: Service Name',
            data: row,
          });
          results.failed++;
          continue;
        }

        // Parse and validate billing cycle
        let billingCycle: BillingCycle = BillingCycle.MONTHLY;
        if (row['Billing Cycle']) {
          const cycleInput = row['Billing Cycle'].toUpperCase();
          if (!['MONTHLY', 'YEARLY', 'ONE_TIME'].includes(cycleInput)) {
            results.errors.push({
              row: rowNumber,
              error: 'Invalid billing cycle. Must be MONTHLY, YEARLY, or ONE_TIME',
              data: row,
            });
            results.failed++;
            continue;
          }
          billingCycle = cycleInput as BillingCycle;
        }

        // Parse and validate usage type
        let usageType: UsageType = UsageType.OFFICE;
        if (row['Usage Type']) {
          const typeInput = row['Usage Type'].toUpperCase();
          if (!['OFFICE', 'PROJECT'].includes(typeInput)) {
            results.errors.push({
              row: rowNumber,
              error: 'Invalid usage type. Must be OFFICE or PROJECT',
              data: row,
            });
            results.failed++;
            continue;
          }
          usageType = typeInput as UsageType;
        }

        // Parse status
        let status = 'ACTIVE';
        if (row['Status']) {
          const statusInput = row['Status'].toUpperCase();
          if (!['ACTIVE', 'CANCELLED'].includes(statusInput)) {
            results.errors.push({
              row: rowNumber,
              error: 'Invalid status. Must be ACTIVE or CANCELLED',
              data: row,
            });
            results.failed++;
            continue;
          }
          status = statusInput;
        }

        // Parse auto renew
        let autoRenew = true;
        if (row['Auto Renew']) {
          const renewInput = row['Auto Renew'].toLowerCase();
          autoRenew = renewInput === 'yes' || renewInput === 'true' || renewInput === '1';
        }

        // Parse cost
        let costPerCycle = null;
        let costCurrency = row['Cost Currency'] || 'QAR';
        let costQAR = null;

        if (row['Cost Per Cycle']) {
          const cost = parseFloat(row['Cost Per Cycle']);
          if (isNaN(cost)) {
            results.errors.push({
              row: rowNumber,
              error: 'Invalid cost format',
              data: row,
            });
            results.failed++;
            continue;
          }
          costPerCycle = cost;
        }

        // SAFEGUARD: Calculate costQAR if provided, or auto-calculate from costPerCycle
        if (row['Cost USD']) {
          const usdCost = parseFloat(row['Cost USD']);
          if (!isNaN(usdCost)) {
            costQAR = usdCost;
          }
        } else if (costPerCycle !== null) {
          // Auto-calculate costQAR if not provided in CSV
          const USD_TO_QAR = 3.64;
          if (costCurrency === 'USD') {
            costQAR = costPerCycle;
          } else {
            costQAR = costPerCycle / USD_TO_QAR;
          }
        }

        // Helper function to parse dd/mm/yyyy dates
        const parseDDMMYYYY = (dateStr: string | undefined): Date | null => {
          if (!dateStr) return null;
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
          }
          return null;
        };

        // Parse dates
        const purchaseDate = parseDDMMYYYY(row['Purchase Date (dd/mm/yyyy)']);
        const renewalDate = parseDDMMYYYY(row['Renewal Date (dd/mm/yyyy)']);
        const cancelledAt = parseDDMMYYYY(row['Cancelled At (dd/mm/yyyy)']);
        const reactivatedAt = parseDDMMYYYY(row['Reactivated At (dd/mm/yyyy)']);
        const lastActiveRenewalDate = parseDDMMYYYY(row['Last Active Renewal Date (dd/mm/yyyy)']);
        const createdAt = parseDDMMYYYY(row['Created At (dd/mm/yyyy)']);

        // Project ID handling - keep null if no project found
        let projectId = null;

        // Find user by name or email
        let assignedUserId = null;
        if (row['Assigned User Email']) {
          const user = await prisma.user.findUnique({
            where: { email: row['Assigned User Email'] },
          });
          assignedUserId = user?.id || null;
        }

        // Create subscription with lifecycle fields
        const subscriptionData: any = {
          serviceName: row['Service Name'],
          category: row['Category'] || null,
          accountId: row['Account ID/Email'] || null,
          vendor: row['Vendor'] || null,
          purchaseDate,
          renewalDate,
          billingCycle,
          costPerCycle,
          costCurrency,
          costQAR,
          status,
          usageType,
          autoRenew,
          paymentMethod: row['Payment Method'] || null,
          notes: row['Notes'] || null,
          projectId,
          assignedUserId,
          cancelledAt,
          reactivatedAt,
          lastActiveRenewalDate,
        };

        // Add createdAt if provided (to preserve original creation date)
        if (createdAt) {
          subscriptionData.createdAt = createdAt;
        }

        // If we have an ID from export, try to use it (helps match with history)
        const existingId = row['ID'];

        // Create subscription and log activity in a transaction
        const subscription = await prisma.$transaction(async (tx) => {
          const sub = await tx.subscription.create({
            data: subscriptionData,
          });

          // Log activity
          await tx.activityLog.create({
            data: {
              actorUserId: session.user.id,
              action: ActivityActions.SUBSCRIPTION_CREATED,
              entityType: 'Subscription',
              entityId: sub.id,
              payload: {
                serviceName: sub.serviceName,
                billingCycle: sub.billingCycle,
                source: 'CSV Import',
              },
            },
          });

          return sub;
        });

        // Map old ID to new ID if we have an old ID from export
        if (existingId) {
          idMap.set(existingId, subscription.id);
        }

        results.created.push({
          serviceName: subscription.serviceName,
          billingCycle: subscription.billingCycle,
          costPerCycle: subscription.costPerCycle ? Number(subscription.costPerCycle) : null,
        });
        results.success++;
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
        results.failed++;
      }
    }

    // Import subscription history if available
    let historyImported = 0;
    let historyFailed = 0;

    if (historyRows.length > 0) {
      console.log(`Importing ${historyRows.length} history entries...`);

      // Helper function to parse dd/mm/yyyy dates
      const parseDDMMYYYY = (dateStr: string | undefined): Date | null => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          return new Date(year, month, day);
        }
        return null;
      };

      for (const historyRow of historyRows) {
        try {
          const oldSubscriptionId = historyRow['Subscription ID'];

          // Map old subscription ID to new one if available
          const subscriptionId = idMap.get(oldSubscriptionId) || oldSubscriptionId;

          // Check if subscription exists
          const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
          });

          if (!subscription) {
            console.log(`Subscription ${subscriptionId} not found for history entry, skipping`);
            historyFailed++;
            continue;
          }

          // Find performer by name or create system entry
          let performerId = session.user.id; // Default to current user
          if (historyRow['Performed By'] && historyRow['Performed By'] !== 'System') {
            const performer = await prisma.user.findFirst({
              where: {
                OR: [
                  { name: historyRow['Performed By'] },
                  { email: historyRow['Performed By'] },
                ],
              },
            });
            if (performer) {
              performerId = performer.id;
            }
          }

          // Create history entry
          await prisma.subscriptionHistory.create({
            data: {
              subscriptionId,
              action: historyRow['Action'] as any,
              oldStatus: (historyRow['Old Status'] as SubscriptionStatus) || null,
              newStatus: (historyRow['New Status'] as SubscriptionStatus) || null,
              oldRenewalDate: parseDDMMYYYY(historyRow['Old Renewal Date (dd/mm/yyyy)']),
              newRenewalDate: parseDDMMYYYY(historyRow['New Renewal Date (dd/mm/yyyy)']),
              assignmentDate: parseDDMMYYYY(historyRow['Assignment Date (dd/mm/yyyy)']),
              reactivationDate: parseDDMMYYYY(historyRow['Reactivation Date (dd/mm/yyyy)']),
              notes: historyRow['Notes'] || null,
              performedBy: performerId,
              createdAt: parseDDMMYYYY(historyRow['Created At (dd/mm/yyyy)']) || new Date(),
            },
          });

          historyImported++;
        } catch (error) {
          console.error('Error importing history entry:', error);
          historyFailed++;
        }
      }
    }

    return NextResponse.json(
      {
        message: `Import completed: ${results.success} subscriptions successful, ${results.failed} failed${historyImported > 0 ? `, ${historyImported} history entries imported` : ''}`,
        results,
        historyImported,
        historyFailed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscription import error:', error);
    return NextResponse.json(
      { error: 'Failed to import subscriptions', details: (error as Error).message },
      { status: 500 }
    );
  }
}
