import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // New requests (last hour)
    const newRequests = await prisma.request.findMany({
      where: {
        createdAt: { gte: oneHourAgo }
      },
      include: {
        _count: {
          select: { proposals: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Unresponded requests (older than 1 hour, no proposals)
    const unrespondedRequests = await prisma.request.findMany({
      where: {
        createdAt: { lt: oneHourAgo },
        proposals: {
          none: {}
        },
        eventDate: { gte: new Date() }
      },
      include: {
        _count: {
          select: { proposals: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    return NextResponse.json({
      newRequests: newRequests.map(req => ({
        ...req,
        proposalCount: req._count.proposals
      })),
      unrespondedRequests: unrespondedRequests.map(req => ({
        ...req,
        proposalCount: req._count.proposals
      }))
    });

  } catch (error) {
    console.error('Error fetching liquidity data:', error);
    return NextResponse.json({ error: 'Failed to fetch liquidity data' }, { status: 500 });
  }
}
