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

    // Fetch bookings within date range
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        totalPrice: true,
        bookingType: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group bookings by date
    const bookingsByDate = new Map<string, number>();

    // Initialize all dates with 0 bookings
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      bookingsByDate.set(dateStr, 0);
    }

    // Count bookings for each date
    bookings.forEach(booking => {
      const dateStr = booking.createdAt.toISOString().split('T')[0];
      const currentCount = bookingsByDate.get(dateStr) || 0;
      bookingsByDate.set(dateStr, currentCount + 1);
    });

    // Convert to array format
    const bookingsData = Array.from(bookingsByDate.entries()).map(([date, count]) => ({
      date,
      count
    }));

    // Calculate summary stats
    const totalBookings = bookings.length;
    const averageDailyBookings = totalBookings / days;
    const daysWithBookings = bookingsData.filter(item => item.count > 0).length;

    // Status breakdown
    const statusBreakdown = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Booking type breakdown
    const typeBreakdown = bookings.reduce((acc, booking) => {
      acc[booking.bookingType] = (acc[booking.bookingType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Total value of bookings
    const totalBookingValue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

    return NextResponse.json({
      data: bookingsData,
      summary: {
        totalBookings,
        averageDailyBookings: Math.round(averageDailyBookings * 100) / 100,
        daysWithBookings,
        totalBookingValue: Math.round(totalBookingValue * 100) / 100,
        statusBreakdown,
        typeBreakdown,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Bookings analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
