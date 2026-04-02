import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30'; // days

    const userId = session.user.id;
    const userRole = session.user.role;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

    // For trend calculation - previous period
    const previousDaysAgo = new Date();
    previousDaysAgo.setDate(previousDaysAgo.getDate() - (parseInt(timeRange) * 2));

    let analytics: any = {};

    if (userRole === 'CLIENT') {
      // Client Analytics
      const [
        totalBookings,
        totalSpending,
        bookingsByStatus,
        spendingTrends,
        previousPeriodBookings,
        previousPeriodSpending,
      ] = await Promise.all([
        // Total bookings
        prisma.booking.count({
          where: {
            clientId: userId,
            createdAt: { gte: daysAgo },
          },
        }),
        
        // Total spending
        prisma.booking.aggregate({
          where: {
            clientId: userId,
            createdAt: { gte: daysAgo },
          },
          _sum: { totalPrice: true },
        }),

        // Bookings by status
        prisma.booking.groupBy({
          by: ['status'],
          where: {
            clientId: userId,
            createdAt: { gte: daysAgo },
          },
          _count: true,
        }),

        // Spending trends over time
        prisma.booking.findMany({
          where: {
            clientId: userId,
            createdAt: { gte: daysAgo },
            status: 'COMPLETED',
          },
          select: {
            totalPrice: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),

        // Previous period bookings for trend calculation
        prisma.booking.count({
          where: {
            clientId: userId,
            createdAt: { 
              gte: previousDaysAgo,
              lt: daysAgo,
            },
          },
        }),

        // Previous period spending for trend calculation
        prisma.booking.aggregate({
          where: {
            clientId: userId,
            createdAt: { 
              gte: previousDaysAgo,
              lt: daysAgo,
            },
          },
          _sum: { totalPrice: true },
        }),
      ]);

      // Calculate trends
      const bookingsTrend = previousPeriodBookings > 0 
        ? ((totalBookings - previousPeriodBookings) / previousPeriodBookings) * 100
        : 0;
      
      const spendingTrend = (previousPeriodSpending._sum.totalPrice || 0) > 0
        ? (((totalSpending._sum.totalPrice || 0) - (previousPeriodSpending._sum.totalPrice || 0)) / (previousPeriodSpending._sum.totalPrice || 0)) * 100
        : 0;

      analytics = {
        totalBookings,
        totalSpending: totalSpending._sum.totalPrice || 0,
        bookingsByStatus: bookingsByStatus.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        spendingTrends: spendingTrends.map((booking: any) => ({
          date: booking.createdAt.toISOString().split('T')[0],
          amount: booking.totalPrice,
        })),
        trends: {
          bookingsChange: parseFloat(bookingsTrend.toFixed(1)),
          spendingChange: parseFloat(spendingTrend.toFixed(1)),
        },
      };
    } else if (userRole === 'CHEF') {
      // Chef Analytics
      const chefProfile = await prisma.chefProfile.findUnique({
        where: { userId },
        include: {
          bookings: {
            where: { createdAt: { gte: daysAgo } },
            include: {
              payments: true,
            },
          },
          reviews: true,
          proposals: true,
        } as any,
      }) as any;

      if (!chefProfile) {
        return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
      }

      // Previous period data for trends
      const previousPeriodProfile = await prisma.chefProfile.findUnique({
        where: { userId },
        include: {
          bookings: {
            where: { 
              createdAt: { 
                gte: previousDaysAgo,
                lt: daysAgo,
              },
            },
            include: {
              payments: true,
            },
          },
        } as any,
      }) as any;

      const completedBookings = chefProfile.bookings.filter((b: any) => b.status === 'COMPLETED');
      const totalEarnings = completedBookings.reduce((sum: number, booking: any) => {
        const payment = booking.payments.find((p: any) => p.status === 'RELEASED');
        return sum + (payment ? payment.chefAmount : 0);
      }, 0);

      const previousCompletedBookings = previousPeriodProfile?.bookings?.filter((b: any) => b.status === 'COMPLETED') || [];
      const previousEarnings = previousCompletedBookings.reduce((sum: number, booking: any) => {
        const payment = booking.payments.find((p: any) => p.status === 'RELEASED');
        return sum + (payment ? payment.chefAmount : 0);
      }, 0);

      const earningsTrend = previousEarnings > 0
        ? ((totalEarnings - previousEarnings) / previousEarnings) * 100
        : 0;

      const bookingsTrend = previousCompletedBookings.length > 0
        ? ((completedBookings.length - previousCompletedBookings.length) / previousCompletedBookings.length) * 100
        : 0;

      const earningsTrends = completedBookings.map((booking: any) => {
        const payment = booking.payments.find((p: any) => p.status === 'RELEASED');
        return {
          date: booking.createdAt.toISOString().split('T')[0],
          amount: payment ? payment.chefAmount : 0,
        };
      });

      const bookingsByStatus = chefProfile.bookings.reduce((acc: any, booking: any) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const averageRating = chefProfile.reviews.length > 0
        ? chefProfile.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / chefProfile.reviews.length
        : 0;

      analytics = {
        totalBookings: chefProfile.bookings.length,
        completedBookings: completedBookings.length,
        totalEarnings,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: chefProfile.reviews.length,
        proposalsSent: chefProfile.proposals.length,
        bookingsByStatus,
        earningsTrends,
        trends: {
          earningsChange: parseFloat(earningsTrend.toFixed(1)),
          bookingsChange: parseFloat(bookingsTrend.toFixed(1)),
        },
      };
    } else if (userRole === 'ADMIN') {
      // Admin Analytics
      const [
        totalUsers,
        totalChefs,
        totalClients,
        totalBookings,
        totalRevenue,
        activeBookings,
        pendingProposals,
        platformStats,
        previousPeriodUsers,
        previousPeriodRevenue,
      ] = await Promise.all([
        // Total users
        prisma.user.count(),
        
        // Total chefs
        prisma.chefProfile.count({
          where: { 
            isApproved: true,
          },
        }),
        
        // Total clients
        prisma.user.count({
          where: { 
            role: 'CLIENT',
          },
        }),
        
        // Total bookings
        prisma.booking.count({
          where: { createdAt: { gte: daysAgo } },
        }),
        
        // Total revenue (platform commission)
        prisma.payment.aggregate({
          where: {
            status: 'RELEASED',
            createdAt: { gte: daysAgo },
          },
          _sum: { commissionAmount: true } as any,
        }),
        
        // Active bookings
        prisma.booking.count({
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            createdAt: { gte: daysAgo },
          },
        }),
        
        // Pending proposals
        prisma.proposal.count({
          where: {
            status: 'PENDING',
            createdAt: { gte: daysAgo },
          },
        }),
        
        // Platform activity over time
        prisma.booking.groupBy({
          by: ['status'],
          where: { createdAt: { gte: daysAgo } },
          _count: true,
        }),

        // Previous period users for trend
        prisma.user.count({
          where: {
            createdAt: {
              gte: previousDaysAgo,
              lt: daysAgo,
            },
          },
        }),

        // Previous period revenue for trend
        prisma.payment.aggregate({
          where: {
            status: 'RELEASED',
            createdAt: {
              gte: previousDaysAgo,
              lt: daysAgo,
            },
          },
          _sum: { commissionAmount: true } as any,
        }),
      ]);

      const usersTrend = previousPeriodUsers > 0
        ? ((totalUsers - previousPeriodUsers) / previousPeriodUsers) * 100
        : 0;

      const revenueTrend = (previousPeriodRevenue._sum?.commissionAmount || 0) > 0
        ? (((totalRevenue._sum?.commissionAmount || 0) - (previousPeriodRevenue._sum?.commissionAmount || 0)) / (previousPeriodRevenue._sum?.commissionAmount || 0)) * 100
        : 0;

      analytics = {
        totalUsers,
        totalChefs,
        totalClients,
        totalBookings,
        totalRevenue: totalRevenue._sum?.commissionAmount || 0,
        activeBookings,
        pendingProposals,
        platformStats: platformStats.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        trends: {
          usersChange: parseFloat(usersTrend.toFixed(1)),
          revenueChange: parseFloat(revenueTrend.toFixed(1)),
        },
      };
    }

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
