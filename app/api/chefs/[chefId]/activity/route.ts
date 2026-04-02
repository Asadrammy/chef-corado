import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chefId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chefId } = await params;

    // Get chef profile and activity data
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: chefId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        proposals: {
          select: {
            id: true,
            createdAt: true,
            status: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        bookings: {
          select: {
            id: true,
            createdAt: true,
            status: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    // Calculate activity metrics
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get recent activity timestamps
    const recentActivities = [
      ...chefProfile.proposals.map(p => p.createdAt),
      ...chefProfile.bookings.map(b => b.createdAt)
    ].sort((a, b) => b.getTime() - a.getTime());

    const lastActivity = recentActivities[0] || null;

    // Check if chef is currently active (had activity in last hour)
    const isActive = lastActivity ? lastActivity > oneHourAgo : false;

    // Calculate average response time (time from request to proposal)
    const responseTimes = await prisma.$queryRaw`
      SELECT 
        AVG(
          (julianday(p.createdAt) - julianday(r.createdAt)) * 24 * 60
        ) as avgResponseMinutes
      FROM Request r
      JOIN Proposal p ON r.id = p.requestId
      WHERE p.chefId = ${chefId}
      AND r.createdAt >= ${oneWeekAgo.toISOString()}
    `;

    const avgResponseTime = Array.isArray(responseTimes) && responseTimes[0]?.avgResponseMinutes 
      ? Math.round(Number(responseTimes[0].avgResponseMinutes))
      : null;

    return NextResponse.json({
      isActive,
      lastSeen: lastActivity ? lastActivity.toISOString() : null,
      avgResponseTime
    });
  } catch (error) {
    console.error('Error fetching chef activity:', error);
    return NextResponse.json({ error: 'Failed to fetch chef activity' }, { status: 500 });
  }
}
