import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    
    // Users can only access their own gamification data, admins can access any
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate real gamification data based on user activity
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: {
          include: {
            proposals: true,
            reviews: true,
            bookings: true
          }
        },
        requests: true,
        bookings: true,
        reviews: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch payments for completed bookings
    const completedPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        booking: {
          OR: [
            { clientId: userId },
            { chefId: userId }
          ]
        }
      }
    });

    let points = 0;
    let level = 1;
    const achievements: any[] = [];

    // Calculate points based on real activity
    if (user.role === 'CLIENT') {
      // Client points calculation
      const requestCount = user.requests.length;
      const bookingCount = user.bookings.length;
      const reviewCount = user.reviews.length;
      const paymentCount = completedPayments.length;

      points += requestCount * 10; // 10 points per request
      points += bookingCount * 25; // 25 points per booking
      points += reviewCount * 15; // 15 points per review
      points += paymentCount * 20; // 20 points per completed payment

      // Client achievements
      if (requestCount >= 1) achievements.push({ icon: 'star', name: 'First Request' });
      if (bookingCount >= 1) achievements.push({ icon: 'calendar', name: 'First Booking' });
      if (reviewCount >= 1) achievements.push({ icon: 'heart', name: 'First Review' });
      if (bookingCount >= 5) achievements.push({ icon: 'award', name: 'Regular Client' });
      if (paymentCount >= 3) achievements.push({ icon: 'dollar', name: 'Reliable Payer' });

    } else if (user.role === 'CHEF') {
      // Chef points calculation
      const proposalCount = user.chefProfile?.proposals.length || 0;
      const bookingCount = user.chefProfile?.bookings.length || 0;
      const reviewCount = user.chefProfile?.reviews.length || 0;
      const paymentCount = completedPayments.length;
      const isApproved = user.chefProfile?.isApproved || false;
      const isVerified = user.chefProfile?.verified || false;

      points += proposalCount * 15; // 15 points per proposal
      points += bookingCount * 30; // 30 points per booking
      points += reviewCount * 20; // 20 points per review received
      points += paymentCount * 25; // 25 points per completed payment
      if (isApproved) points += 50; // 50 points for approval
      if (isVerified) points += 100; // 100 points for verification

      // Chef achievements
      if (isApproved) achievements.push({ icon: 'check', name: 'Approved Chef' });
      if (isVerified) achievements.push({ icon: 'award', name: 'Verified Chef' });
      if (proposalCount >= 1) achievements.push({ icon: 'send', name: 'First Proposal' });
      if (bookingCount >= 1) achievements.push({ icon: 'calendar', name: 'First Booking' });
      if (reviewCount >= 1) achievements.push({ icon: 'star', name: 'First Review' });
      if (bookingCount >= 10) achievements.push({ icon: 'trophy', name: 'Experienced Chef' });
      if (paymentCount >= 5) achievements.push({ icon: 'dollar', name: 'Top Earner' });
    }

    // Calculate level based on points (every 100 points = 1 level)
    level = Math.floor(points / 100) + 1;
    const nextLevelPoints = level * 100;

    // Limit achievements to show most recent 6
    const limitedAchievements = achievements.slice(-6);

    return NextResponse.json({
      level,
      points,
      achievements: limitedAchievements,
      nextLevelPoints
    });
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    return NextResponse.json({ error: 'Failed to fetch gamification data' }, { status: 500 });
  }
}
