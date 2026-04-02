import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'CHEF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get chef profile
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    // Fetch completed bookings with payments
    const completedBookings = await prisma.booking.findMany({
      where: {
        chefId: chefProfile.id,
        status: 'COMPLETED',
        payments: {
          status: 'COMPLETED'
        }
      },
      include: {
        payments: {
          where: {
            status: 'COMPLETED'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group earnings by month
    const earningsByMonth = new Map<string, number>();

    completedBookings.forEach(booking => {
      const month = booking.createdAt.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      // Sum completed payments for this booking
      const bookingEarnings = booking.payments ? 
        (booking.payments.totalAmount - booking.payments.commissionAmount) : 0;

      const currentEarnings = earningsByMonth.get(month) || 0;
      earningsByMonth.set(month, currentEarnings + bookingEarnings);
    });

    // Convert to array format and sort by date
    const earningsData = Array.from(earningsByMonth.entries())
      .map(([month, earnings]) => ({
        month: month.split(' ')[0], // Just the month name (Jan, Feb, etc.)
        earnings: Math.round(earnings * 100) / 100 // Round to 2 decimal places
      }))
      .sort((a, b) => {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

    return NextResponse.json(earningsData);

  } catch (error) {
    console.error('Earnings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
