import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'CHEF') {
      return NextResponse.json({ error: 'Only chefs can access payout balance' }, { status: 403 });
    }

    // Get chef profile
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    // Calculate available balance (completed bookings with paid payments, minus paid out amounts)
    const completedBookings = await prisma.booking.findMany({
      where: {
        chefId: chefProfile.id,
        status: 'COMPLETED',
        payments: {
          status: 'COMPLETED',
        },
      },
      include: {
        payments: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    const totalEarnings = completedBookings.reduce((sum: number, booking: any) => {
      const payment = booking.payments;
      if (payment) {
        // Assuming 10% commission, adjust as needed
        const commission = payment.commissionAmount;
        return sum + (payment.totalAmount - commission);
      }
      return sum;
    }, 0);

    // Calculate total paid out
    const paidPayouts = await (prisma as any).payout.findMany({
      where: {
        chefId: chefProfile.id,
        status: 'COMPLETED',
      },
    });

    const totalPaidOut = paidPayouts.reduce((sum: number, payout: any) => sum + payout.amount, 0);

    // Calculate pending payouts
    const pendingPayouts = await (prisma as any).payout.findMany({
      where: {
        chefId: chefProfile.id,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    const totalPendingPayouts = pendingPayouts.reduce((sum: number, payout: any) => sum + payout.amount, 0);

    const availableBalance = totalEarnings - totalPaidOut - totalPendingPayouts;

    // Calculate pending earnings (from non-completed bookings)
    const activeBookings = await prisma.booking.findMany({
      where: {
        chefId: chefProfile.id,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        payments: {
          status: 'COMPLETED',
        },
      },
      include: {
        payments: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    const pendingEarnings = activeBookings.reduce((sum: number, booking: any) => {
      const payment = booking.payments;
      if (payment) {
        const commission = payment.commissionAmount;
        return sum + (payment.totalAmount - commission);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      availableBalance: Math.max(0, availableBalance),
      pendingEarnings,
      totalEarnings,
      completedBookings: completedBookings.length,
    });
  } catch (error) {
    console.error('Error fetching payout balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
