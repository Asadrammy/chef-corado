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
    
    // Users can only access their own engagement score, admins can access any
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate real engagement score based on user activity
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: {
          include: {
            proposals: true
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

    // Fetch payments separately since they're not directly related to User
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          OR: [
            { clientId: userId },
            { chefId: userId }
          ]
        }
      }
    });

    let score = 0;
    const maxScore = 100;

    // Profile completion (20 points)
    score += Math.min((user.profileCompletion || 0) / 100 * 20, 20);

    if (user.role === 'CLIENT') {
      // Client-specific engagement
      const requestCount = user.requests.length;
      const bookingCount = user.bookings.length;
      const reviewCount = user.reviews.length;
      const completedPaymentCount = payments.filter((p: any) => p.status === 'COMPLETED').length;

      // Requests (15 points)
      score += Math.min(requestCount * 3, 15);
      
      // Bookings (20 points)
      score += Math.min(bookingCount * 4, 20);
      
      // Reviews (15 points)
      score += Math.min(reviewCount * 5, 15);
      
      // Completed payments (10 points)
      score += Math.min(completedPaymentCount * 2, 10);
      
      // Recent activity (20 points) - based on last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentActivity = [
        ...user.requests.filter((r: any) => new Date(r.createdAt) > thirtyDaysAgo),
        ...user.bookings.filter((b: any) => new Date(b.createdAt) > thirtyDaysAgo),
        ...user.reviews.filter((r: any) => new Date(r.createdAt) > thirtyDaysAgo)
      ].length;
      score += Math.min(recentActivity * 4, 20);
      
    } else if (user.role === 'CHEF') {
      // Chef-specific engagement
      const proposalCount = user.chefProfile?.proposals.length || 0;
      const bookingCount = user.bookings.length;
      const reviewCount = user.reviews.length;
      const completedPaymentCount = payments.filter((p: any) => p.status === 'COMPLETED').length;
      const isApproved = user.chefProfile?.isApproved || false;
      const isVerified = user.chefProfile?.verified || false;

      // Verification status (10 points)
      if (isApproved) score += 5;
      if (isVerified) score += 5;
      
      // Proposals (15 points)
      score += Math.min(proposalCount * 3, 15);
      
      // Bookings (20 points)
      score += Math.min(bookingCount * 4, 20);
      
      // Reviews received (15 points)
      score += Math.min(reviewCount * 3, 15);
      
      // Completed payments (10 points)
      score += Math.min(completedPaymentCount * 2, 10);
      
      // Recent activity (20 points) - based on last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentActivity = [
        ...(user.chefProfile?.proposals || []).filter((p: any) => new Date(p.createdAt) > thirtyDaysAgo),
        ...user.bookings.filter((b: any) => new Date(b.createdAt) > thirtyDaysAgo),
        ...user.reviews.filter((r: any) => new Date(r.createdAt) > thirtyDaysAgo)
      ].length;
      score += Math.min(recentActivity * 4, 20);
    }

    // Ensure score doesn't exceed 100
    score = Math.min(Math.round(score), maxScore);

    return NextResponse.json({ score });
  } catch (error) {
    console.error('Error calculating engagement score:', error);
    return NextResponse.json({ error: 'Failed to calculate engagement score' }, { status: 500 });
  }
}
