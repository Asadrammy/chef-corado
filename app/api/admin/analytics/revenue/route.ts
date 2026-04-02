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

    // Fetch completed payments with commission data
    const payments = await prisma.payment.findMany({
      where: {
        status: 'RELEASED',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        booking: {
          select: {
            createdAt: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group revenue by date
    const revenueByDate = new Map<string, number>();

    // Initialize all dates with 0 revenue
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      revenueByDate.set(dateStr, 0);
    }

    // Sum commission (platform revenue) for each date
    payments.forEach(payment => {
      const dateStr = payment.createdAt.toISOString().split('T')[0];
      const currentRevenue = revenueByDate.get(dateStr) || 0;
      revenueByDate.set(dateStr, currentRevenue + (payment as any).commission);
    });

    // Convert to array format
    const revenueData = Array.from(revenueByDate.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100 // Round to 2 decimal places
    }));

    // Calculate summary stats
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
    const averageDailyRevenue = totalRevenue / days;
    const daysWithRevenue = revenueData.filter(item => item.revenue > 0).length;

    return NextResponse.json({
      data: revenueData,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageDailyRevenue: Math.round(averageDailyRevenue * 100) / 100,
        daysWithRevenue,
        totalPayments: payments.length,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
