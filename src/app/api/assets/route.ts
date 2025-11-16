import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createAssetSchema, assetQuerySchema } from '@/lib/validations/assets';
import { logAction, ActivityActions } from '@/lib/activity';
import { generateAssetTag } from '@/lib/asset-utils';
import { recordAssetCreation } from '@/lib/asset-history';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { buildFilterWithSearch } from '@/lib/db/search-filter';
import { withErrorHandler } from '@/lib/http/handler';

async function getAssetsHandler(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = assetQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: validation.error.issues
    }, { status: 400 });
  }

  const { q, status, type, category, p, ps, sort, order } = validation.data;

  // Build filters object
  const filters: any = {};
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (category) filters.category = category;

  // Build where clause using reusable search filter
  const where = buildFilterWithSearch({
    searchTerm: q,
    searchFields: ['assetTag', 'model', 'brand', 'serial', 'type', 'supplier', 'configuration'],
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // Calculate pagination
  const skip = (p - 1) * ps;

  // Fetch assets
  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { [sort]: order },
      take: ps,
      skip,
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
    prisma.asset.count({ where }),
  ]);

  return NextResponse.json({
    assets,
    pagination: {
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
      hasMore: skip + ps < total,
    },
  });
}

export const GET = withErrorHandler(getAssetsHandler, { requireAuth: true, rateLimit: true });

async function createAssetHandler(request: NextRequest) {
  // Check authentication and authorization
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = createAssetSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues
    }, { status: 400 });
  }

  const data = validation.data;

  // Generate asset tag if not provided, and ensure it's always uppercase
  let assetTag = data.assetTag || await generateAssetTag(data.type);
  if (assetTag) {
    assetTag = assetTag.toUpperCase();
  }

  // Check if asset tag already exists
  if (assetTag) {
    const existingAsset = await prisma.asset.findFirst({
      where: { assetTag },
    });

    if (existingAsset) {
      return NextResponse.json({
        error: 'Asset tag already exists',
        details: [{ message: `Asset tag "${assetTag}" is already in use. Please use a unique asset tag.` }]
      }, { status: 400 });
    }
  }

  // SAFEGUARD: Always calculate priceQAR to prevent data loss
  let priceQAR = data.priceQAR;

  // Default currency to QAR if not specified
  const currency = data.priceCurrency || 'QAR';

  if (data.price && !priceQAR) {
    // If priceQAR is missing, calculate it based on currency
    if (currency === 'QAR') {
      // QAR is base currency, store as-is
      priceQAR = data.price;
    } else {
      // USD - convert to QAR
      priceQAR = data.price * USD_TO_QAR_RATE;
    }
  }

  // Convert date strings to Date objects and handle empty strings
  const assetData: any = {
    assetTag,
    type: data.type,
    category: data.category || null,
    brand: data.brand || null,
    model: data.model,
    serial: data.serial || null,
    configuration: data.configuration || null,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
    supplier: data.supplier || null,
    invoiceNumber: data.invoiceNumber || null,
    price: data.price || null,
    priceCurrency: currency, // Use the calculated currency with default
    priceQAR: priceQAR || null, // Ensure priceQAR is always calculated
    status: data.status,
    acquisitionType: data.acquisitionType,
    transferNotes: data.transferNotes || null,
    assignedUserId: data.assignedUserId || null,
    notes: data.notes || null,
    location: data.location || null,
  };

  // Create asset
  const asset = await prisma.asset.create({
    data: assetData,
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
  await logAction(
    session.user.id,
    ActivityActions.ASSET_CREATED,
    'Asset',
    asset.id,
    { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag }
  );

  // Record asset history
  await recordAssetCreation(
    asset.id,
    session.user.id,
    asset.assignedUserId,
    null
  );

  return NextResponse.json(asset, { status: 201 });
}

export const POST = withErrorHandler(createAssetHandler, { requireAdmin: true, rateLimit: true });