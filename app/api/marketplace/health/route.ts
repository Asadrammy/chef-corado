import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active chefs (logged in within last hour)
    const activeChefs = await prisma.user.count({
      where: {
        role: 'CHEF',
        chefProfile: {
          isApproved: true,
          isBanned: false
        }
      }
    });

    // Total open requests
    const totalRequests = await prisma.request.count({
      where: {
        eventDate: {
          gte: now
        }
      }
    });

    // Average response time (time from request to first proposal)
    const responseTimes = await prisma.$queryRaw`
      SELECT 
        AVG(
          (julianday(p.createdAt) - julianday(r.createdAt)) * 24 * 60
        ) as avgResponseMinutes
      FROM Request r
      JOIN Proposal p ON r.id = p.requestId
      WHERE r.createdAt >= ${oneWeekAgo.toISOString()}
      AND p.createdAt = (
        SELECT MIN(p2.createdAt)
        FROM Proposal p2
        WHERE p2.requestId = r.id
      )
    `;

    // Match rate (requests with at least one proposal)
    const totalRecentRequests = await prisma.request.count({
      where: {
        createdAt: {
          gte: oneWeekAgo
        }
      }
    });

    const requestsWithProposals = await prisma.request.count({
      where: {
        createdAt: {
          gte: oneWeekAgo
        },
        proposals: {
          some: {}
        }
      }
    });

    const avgResponseTime = Array.isArray(responseTimes) && responseTimes[0]?.avgResponseMinutes 
      ? Math.round(Number(responseTimes[0].avgResponseMinutes))
      : 0;

    const matchRate = totalRecentRequests > 0 
      ? Math.round((requestsWithProposals / totalRecentRequests) * 100)
      : 0;

    // Calculate liquidity score
    const liquidityScore = calculateLiquidityScore({
      activeChefs,
      totalRequests,
      avgResponseTime,
      matchRate
    });

    const health = {
      activeChefs,
      totalRequests,
      avgResponseTime,
      matchRate,
      liquidityScore
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Error fetching marketplace health:', error);
    return NextResponse.json({ error: 'Failed to fetch marketplace health' }, { status: 500 });
  }
}

function calculateLiquidityScore(metrics: {
  activeChefs: number;
  totalRequests: number;
  avgResponseTime: number;
  matchRate: number;
}): number {
  let score = 0;

  // Active chefs (max 30 points)
  if (metrics.activeChefs >= 10) score += 30;
  else if (metrics.activeChefs >= 5) score += 20;
  else if (metrics.activeChefs >= 2) score += 10;

  // Open requests (max 20 points)
  if (metrics.totalRequests >= 20) score += 20;
  else if (metrics.totalRequests >= 10) score += 15;
  else if (metrics.totalRequests >= 5) score += 10;

  // Response time (max 30 points)
  if (metrics.avgResponseTime <= 30) score += 30;
  else if (metrics.avgResponseTime <= 60) score += 20;
  else if (metrics.avgResponseTime <= 120) score += 10;

  // Match rate (max 20 points)
  if (metrics.matchRate >= 80) score += 20;
  else if (metrics.matchRate >= 60) score += 15;
  else if (metrics.matchRate >= 40) score += 10;

  return Math.min(100, Math.max(0, score));
}
