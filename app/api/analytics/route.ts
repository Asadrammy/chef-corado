import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isLocalDemoSessionUser } from '@/lib/auth';
import { localDemoAdminAnalytics, localDemoChefAnalytics, localDemoClientAnalytics } from '@/lib/local-demo-data';
import { isPrismaConnectionError, prisma } from '@/lib/prisma';

type CurrencyAmount = {
  currency: string;
  amount: number;
};

function normalizeCurrency(currency?: string | null) {
  return (currency || 'GBP').toUpperCase();
}

function currencySums(
  rows: Array<{ currency: string | null; _sum: Record<string, number | null> }>,
  key: string
): CurrencyAmount[] {
  return rows
    .map((row) => ({
      currency: normalizeCurrency(row.currency),
      amount: Number(row._sum?.[key] ?? 0),
    }))
    .filter((row) => row.amount > 0);
}

function singleCurrencyTotal(amounts: CurrencyAmount[]) {
  return amounts.length === 1 ? amounts[0].amount : undefined;
}

function comparableTrend(current: CurrencyAmount[], previous: CurrencyAmount[]) {
  if (current.length !== 1 || previous.length !== 1 || current[0].currency !== previous[0].currency) {
    return undefined;
  }

  if (previous[0].amount <= 0) {
    return 0;
  }

  return parseFloat((((current[0].amount - previous[0].amount) / previous[0].amount) * 100).toFixed(1));
}

function releasedPayment(booking: any) {
  const payments = Array.isArray(booking.payments)
    ? booking.payments
    : booking.payments
      ? [booking.payments]
      : [];

  return payments.find((payment: any) => payment.status === 'RELEASED' || payment.status === 'COMPLETED');
}

export async function GET(request: NextRequest) {
  let sessionRole: string | undefined

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    sessionRole = session.user.role

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30'; // days

    const userId = session.user.id;
    const userRole = session.user.role;

    if (isLocalDemoSessionUser(userId, session.user.email)) {
      if (userRole === 'ADMIN') {
        return NextResponse.json(localDemoAdminAnalytics());
      }

      if (userRole === 'CHEF') {
        return NextResponse.json(localDemoChefAnalytics());
      }

      return NextResponse.json(localDemoClientAnalytics());
    }

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
        totalSpendingByCurrencyRows,
        bookingsByStatus,
        spendingTrends,
        previousPeriodBookings,
        previousPeriodSpendingByCurrencyRows,
      ] = await Promise.all([
        // Total bookings
        prisma.booking.count({
          where: {
            clientId: userId,
            createdAt: { gte: daysAgo },
          },
        }),
        
        // Total spending
        prisma.booking.groupBy({
          by: ['currency'],
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
            currency: true,
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
        prisma.booking.groupBy({
          by: ['currency'],
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
      
      const totalSpendingByCurrency = currencySums(totalSpendingByCurrencyRows as any, 'totalPrice');
      const previousPeriodSpendingByCurrency = currencySums(previousPeriodSpendingByCurrencyRows as any, 'totalPrice');

      analytics = {
        totalBookings,
        totalSpending: singleCurrencyTotal(totalSpendingByCurrency),
        totalSpendingByCurrency,
        bookingsByStatus: bookingsByStatus.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        spendingTrends: spendingTrends.map((booking: any) => ({
          date: booking.createdAt.toISOString().split('T')[0],
          amount: booking.totalPrice,
          currency: normalizeCurrency(booking.currency),
        })),
        trends: {
          bookingsChange: parseFloat(bookingsTrend.toFixed(1)),
          spendingChange: comparableTrend(totalSpendingByCurrency, previousPeriodSpendingByCurrency),
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
      const earningsByCurrencyMap = new Map<string, number>();
      completedBookings.forEach((booking: any) => {
        const payment = releasedPayment(booking);
        if (!payment) return;
        const currency = normalizeCurrency(payment.currency || booking.currency);
        earningsByCurrencyMap.set(currency, (earningsByCurrencyMap.get(currency) || 0) + Number(payment.chefAmount || 0));
      });
      const earningsByCurrency = Array.from(earningsByCurrencyMap.entries()).map(([currency, amount]) => ({ currency, amount }));

      const previousCompletedBookings = previousPeriodProfile?.bookings?.filter((b: any) => b.status === 'COMPLETED') || [];
      const previousEarningsByCurrencyMap = new Map<string, number>();
      previousCompletedBookings.forEach((booking: any) => {
        const payment = releasedPayment(booking);
        if (!payment) return;
        const currency = normalizeCurrency(payment.currency || booking.currency);
        previousEarningsByCurrencyMap.set(currency, (previousEarningsByCurrencyMap.get(currency) || 0) + Number(payment.chefAmount || 0));
      });
      const previousEarningsByCurrency = Array.from(previousEarningsByCurrencyMap.entries()).map(([currency, amount]) => ({ currency, amount }));

      const bookingsTrend = previousCompletedBookings.length > 0
        ? ((completedBookings.length - previousCompletedBookings.length) / previousCompletedBookings.length) * 100
        : 0;

      const earningsTrends = completedBookings.map((booking: any) => {
        const payment = releasedPayment(booking);
        return {
          date: booking.createdAt.toISOString().split('T')[0],
          amount: payment ? payment.chefAmount : 0,
          currency: normalizeCurrency(payment?.currency || booking.currency),
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
        totalEarnings: singleCurrencyTotal(earningsByCurrency),
        earningsByCurrency,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: chefProfile.reviews.length,
        proposalsSent: chefProfile.proposals.length,
        bookingsByStatus,
        earningsTrends,
        trends: {
          earningsChange: comparableTrend(earningsByCurrency, previousEarningsByCurrency),
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
        totalRevenueByCurrencyRows,
        activeBookings,
        pendingProposals,
        platformStats,
        previousPeriodUsers,
        previousPeriodRevenueByCurrencyRows,
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
        prisma.payment.groupBy({
          by: ['currency'],
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
        prisma.payment.groupBy({
          by: ['currency'],
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

      const revenueByCurrency = currencySums(totalRevenueByCurrencyRows as any, 'commissionAmount');
      const previousRevenueByCurrency = currencySums(previousPeriodRevenueByCurrencyRows as any, 'commissionAmount');

      analytics = {
        totalUsers,
        totalChefs,
        totalClients,
        totalBookings,
        totalRevenue: singleCurrencyTotal(revenueByCurrency),
        revenueByCurrency,
        activeBookings,
        pendingProposals,
        platformStats: platformStats.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        trends: {
          usersChange: parseFloat(usersTrend.toFixed(1)),
          revenueChange: comparableTrend(revenueByCurrency, previousRevenueByCurrency),
        },
      };
    }

    return NextResponse.json(analytics);
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      const { searchParams } = new URL(request.url);
      const requestedRole = sessionRole || searchParams.get('role');

      if (requestedRole === 'ADMIN') {
        return NextResponse.json(localDemoAdminAnalytics());
      }

      if (requestedRole === 'CHEF') {
        return NextResponse.json(localDemoChefAnalytics());
      }

      return NextResponse.json(localDemoClientAnalytics());
    }

    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
