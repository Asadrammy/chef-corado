import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isLocalDemoSessionUser } from '@/lib/auth';
import { localDemoOnboardingProgress } from '@/lib/local-demo-data';
import { isPrismaConnectionError, prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  let userRole: string | undefined;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    userRole = session.user.role;

    if (isLocalDemoSessionUser(userId, session.user.email)) {
      return NextResponse.json(localDemoOnboardingProgress(userRole));
    }

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
      const chefProfile = await prisma.chefProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          profileCompletion: true,
          isApproved: true,
          verified: true
        }
      });

      const chefProfileId = chefProfile?.id;

      const [
        menus,
        experiences,
        proposals,
        bookings,
        payments,
        reviews,
        availabilityCount
      ] = chefProfileId
        ? await Promise.all([
            prisma.menu.count({
              where: { chefId: chefProfileId }
            }),
            prisma.experience.count({
              where: { chefId: chefProfileId }
            }),
            prisma.proposal.count({
              where: { chefId: chefProfileId }
            }),
            prisma.booking.count({
              where: { chefId: chefProfileId }
            }),
            prisma.payment.count({
              where: {
                booking: { chefId: chefProfileId },
                status: { in: ['COMPLETED', 'RELEASED'] }
              }
            }),
            prisma.review.count({
              where: { chefId: chefProfileId }
            }),
            prisma.availability.count({
              where: { chefId: chefProfileId }
            })
          ])
        : [0, 0, 0, 0, 0, 0, 0];

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
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      return NextResponse.json(localDemoOnboardingProgress(userRole));
    }

    console.error('Error fetching onboarding progress:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding progress' }, { status: 500 });
  }
}
