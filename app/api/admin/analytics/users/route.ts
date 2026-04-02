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

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Fetch users created within date range
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        createdAt: true,
        role: true,
        name: true,
        email: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group users by date
    const usersByDate = new Map<string, number>();

    // Initialize all dates with 0 users
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      usersByDate.set(dateStr, 0);
    }

    // Count new users for each date
    users.forEach(user => {
      const dateStr = user.createdAt.toISOString().split('T')[0];
      const currentCount = usersByDate.get(dateStr) || 0;
      usersByDate.set(dateStr, currentCount + 1);
    });

    // Convert to array format
    const usersData = Array.from(usersByDate.entries()).map(([date, newUsers]) => ({
      date,
      newUsers
    }));

    // Calculate summary stats
    const totalNewUsers = users.length;
    const averageDailyUsers = totalNewUsers / days;
    const daysWithNewUsers = usersData.filter(item => item.newUsers > 0).length;

    // Role breakdown
    const roleBreakdown = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total platform users for context
    const totalPlatformUsers = await prisma.user.count();

    return NextResponse.json({
      data: usersData,
      summary: {
        totalNewUsers,
        averageDailyUsers: Math.round(averageDailyUsers * 100) / 100,
        daysWithNewUsers,
        roleBreakdown,
        totalPlatformUsers,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Users analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
