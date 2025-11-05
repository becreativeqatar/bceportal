import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/activity';
import { Role, AccreditationStatus } from '@prisma/client';

interface ImportRecord {
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  accessGroup: string;
  identificationType: string;
  qidNumber?: string;
  qidExpiry?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportExpiry?: string;
  hayyaVisaNumber?: string;
  hayyaVisaExpiry?: string;
}

// Helper function to generate accreditation number with retry logic
async function generateAccreditationNumber(): Promise<string> {
  const MAX_RETRIES = 5;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const lastAccreditation = await prisma.accreditation.findFirst({
        where: {
          accreditationNumber: {
            startsWith: 'ACC-',
          },
        },
        orderBy: {
          accreditationNumber: 'desc',
        },
      });

      if (!lastAccreditation) {
        return 'ACC-0001';
      }

      const lastNumber = parseInt(lastAccreditation.accreditationNumber.split('-')[1]);
      const nextNumber = lastNumber + 1;
      return `ACC-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
    }
  }

  throw new Error('Failed to generate unique accreditation number after multiple attempts');
}

// POST /api/accreditation/import - Bulk import accreditations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, records, skipDuplicates } = body as {
      projectId: string;
      records: ImportRecord[];
      skipDuplicates: boolean;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    // Check if project exists
    const project = await prisma.accreditationProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Process records in a transaction to ensure atomicity
    try {
      const result = await prisma.$transaction(async (tx) => {
        let txImported = 0;
        let txSkipped = 0;

        for (const record of records) {
          // Check for duplicates based on ID number
          let duplicate;
          if (record.identificationType === 'qid' && record.qidNumber) {
            duplicate = await tx.accreditation.findFirst({
              where: {
                projectId,
                qidNumber: record.qidNumber,
                status: { notIn: ['REJECTED'] },
              },
            });
          } else if (record.identificationType === 'passport' && record.passportNumber) {
            duplicate = await tx.accreditation.findFirst({
              where: {
                projectId,
                passportNumber: record.passportNumber,
                status: { notIn: ['REJECTED'] },
              },
            });
          }

          if (duplicate && skipDuplicates) {
            txSkipped++;
            continue;
          }

          // Generate accreditation number
          const accreditationNumber = await generateAccreditationNumber();

          // Create accreditation
          await tx.accreditation.create({
            data: {
              accreditationNumber,
              firstName: record.firstName,
              lastName: record.lastName,
              organization: record.organization,
              jobTitle: record.jobTitle,
              accessGroup: record.accessGroup,
              qidNumber: record.identificationType === 'qid' ? record.qidNumber : null,
              qidExpiry: record.identificationType === 'qid' && record.qidExpiry ? new Date(record.qidExpiry) : null,
              passportNumber: record.identificationType === 'passport' ? record.passportNumber : null,
              passportCountry: record.identificationType === 'passport' ? record.passportCountry : null,
              passportExpiry: record.identificationType === 'passport' && record.passportExpiry ? new Date(record.passportExpiry) : null,
              hayyaVisaNumber: record.identificationType === 'passport' ? record.hayyaVisaNumber : null,
              hayyaVisaExpiry: record.identificationType === 'passport' && record.hayyaVisaExpiry ? new Date(record.hayyaVisaExpiry) : null,
              hasBumpInAccess: false,
              hasLiveAccess: false,
              hasBumpOutAccess: false,
              status: AccreditationStatus.DRAFT,
              projectId,
              createdById: session.user.id,
            },
          });

          txImported++;
        }

        return { txImported, txSkipped };
      });

      imported = result.txImported;
      skipped = result.txSkipped;
    } catch (error) {
      console.error('Transaction failed, rolling back all imports:', error);
      failed = records.length - skipped;
    }

    // Log activity
    await logAction(
      session.user.id,
      'BULK_IMPORT',
      'accreditation',
      projectId,
      {
        imported,
        skipped,
        failed,
        total: records.length,
      }
    );

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      failed,
      total: records.length,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Failed to import accreditations' },
      { status: 500 }
    );
  }
}
