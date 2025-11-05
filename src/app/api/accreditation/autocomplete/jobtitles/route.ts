import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/accreditation/autocomplete/jobtitles - Get job title suggestions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (q.length < 2) {
      return NextResponse.json({ jobTitles: [] });
    }

    // Get distinct job titles matching the query
    const jobTitles = await prisma.accreditation.findMany({
      where: {
        jobTitle: {
          contains: q,
        },
      },
      select: {
        jobTitle: true,
      },
      distinct: ['jobTitle'],
      take: 10,
      orderBy: {
        jobTitle: 'asc',
      },
    });

    const uniqueJobTitles = jobTitles.map((item) => item.jobTitle);

    return NextResponse.json({ jobTitles: uniqueJobTitles });
  } catch (error) {
    console.error('Autocomplete job titles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job title suggestions' },
      { status: 500 }
    );
  }
}
