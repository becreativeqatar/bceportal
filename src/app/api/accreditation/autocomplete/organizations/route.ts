import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/accreditation/autocomplete/organizations - Get organization suggestions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (q.length < 2) {
      return NextResponse.json({ organizations: [] });
    }

    // Get distinct organizations matching the query
    const organizations = await prisma.accreditation.findMany({
      where: {
        organization: {
          contains: q,
        },
      },
      select: {
        organization: true,
      },
      distinct: ['organization'],
      take: 10,
      orderBy: {
        organization: 'asc',
      },
    });

    const uniqueOrganizations = organizations.map((item) => item.organization);

    return NextResponse.json({ organizations: uniqueOrganizations });
  } catch (error) {
    console.error('Autocomplete organizations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization suggestions' },
      { status: 500 }
    );
  }
}
