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

    const userId = session.user.id;
    const userRole = session.user.role;

    let onboardingData: any = {};

    if (userRole === 'CLIENT') {
      // Fetch client-specific onboarding data
      const [
        user,
        requests,
        bookings,
        payments,
        reviews
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { profileCompletion: true }
        }),
        prisma.request.count({
          where: { clientId: userId }
        }),
        prisma.booking.count({
          where: { clientId: userId }
        }),
        prisma.payment.count({
          where: {
            booking: { clientId: userId },
            status: 'COMPLETED'
          }
        }),
        prisma.review.count({
          where: { clientId: userId }
        })
      ]);

      onboardingData = {
        profileCompletion: user?.profileCompletion || 0,
        hasCreatedRequest: requests > 0,
        hasBrowsedExperiences: true, // Could track this separately
        hasMadeBooking: bookings > 0,
        hasCompletedPayment: payments > 0,
        hasLeftReview: reviews > 0
      };
    } else if (userRole === 'CHEF') {
      // Fetch chef-specific onboarding data
      const [
        chefProfile,
        menus,
        experiences,
        proposals,
        bookings,
        payments,
        reviews
      ] = await Promise.all([
        prisma.chefProfile.findUnique({
          where: { userId },
          select: { 
            profileCompletion: true,
            isApproved: true,
            verified: true
          }
        }),
        prisma.menu.count({
          where: { chefId: userId }
        }),
        prisma.experience.count({
          where: { chefId: userId }
        }),
        prisma.proposal.count({
          where: { chefId: userId }
        }),
        prisma.booking.count({
          where: { chefId: userId }
        }),
        prisma.payment.count({
          where: {
            booking: { chefId: userId },
            status: 'COMPLETED'
          }
        }),
        prisma.review.count({
          where: { chefId: userId }
        })
      ]);

      // Check if chef has set availability
      const availabilityCount = await prisma.availability.count({
        where: { chefId: userId }
      });

      onboardingData = {
        profileCompletion: chefProfile?.profileCompletion || 0,
        isApproved: chefProfile?.isApproved || false,
        isVerified: chefProfile?.verified || false,
        hasCreatedMenu: menus > 0 || experiences > 0,
        hasSetAvailability: availabilityCount > 0,
        hasSentProposal: proposals > 0,
        hasCompletedBooking: bookings > 0,
        hasReceivedPayment: payments > 0,
        hasReceivedReview: reviews > 0
      };
    }

    return NextResponse.json(onboardingData);
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding progress' }, { status: 500 });
  }
}
