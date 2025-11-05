import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assignAssetSchema } from '@/lib/validations/assets';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAssetAssignment } from '@/lib/asset-history';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = assignAssetSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { assignedUserId } = validation.data;

    const { id } = await params;

    // Get current asset for logging
    const currentAsset = await prisma.asset.findUnique({
      where: { id },
      include: { assignedUser: true },
    });

    if (!currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify assigned user exists if provided
    if (assignedUserId) {
      const user = await prisma.user.findUnique({ where: { id: assignedUserId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Update asset assignment
    const asset = await prisma.asset.update({
      where: { id: id },
      data: { assignedUserId },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    const previousUser = currentAsset.assignedUser;
    const newUser = asset.assignedUser;
    
    await logAction(
      session.user.id,
      ActivityActions.ASSET_ASSIGNED,
      'Asset',
      asset.id,
      {
        assetModel: asset.model,
        assetType: asset.type,
        assetTag: asset.assetTag,
        previousUser: previousUser ? { id: previousUser.id, name: previousUser.name } : null,
        newUser: newUser ? { id: newUser.id, name: newUser.name } : null,
      }
    );

    // Record asset assignment history
    await recordAssetAssignment(
      asset.id,
      previousUser?.id || null,
      newUser?.id || null,
      session.user.id
    );

    return NextResponse.json(asset);

  } catch (error) {
    console.error('Asset assign error:', error);
    return NextResponse.json(
      { error: 'Failed to assign asset' },
      { status: 500 }
    );
  }
}