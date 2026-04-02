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
    
    // Users can only access their own engagement prompts, admins can access any
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user data to generate relevant prompts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: {
          include: {
            proposals: true,
            experiences: true,
            availability: true
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

    const prompts: any[] = [];

    if (user.role === 'CLIENT') {
      // Client-specific prompts
      if (user.profileCompletion < 80) {
        prompts.push({
          type: 'complete_profile',
          title: 'Complete Your Profile',
          description: 'Add more details to increase your visibility',
          actionText: 'Update Profile',
          actionUrl: '/dashboard/settings/profile'
        });
      }

      if (user.requests.length === 0) {
        prompts.push({
          type: 'create_request',
          title: 'Create Your First Request',
          description: 'Tell us about your event and culinary needs',
          actionText: 'Create Request',
          actionUrl: '/dashboard/client/create-request'
        });
      }

      if (user.bookings.length === 0 && user.requests.length > 0) {
        prompts.push({
          type: 'browse_experiences',
          title: 'Browse Available Chefs',
          description: 'Find the perfect chef for your event',
          actionText: 'Browse Experiences',
          actionUrl: '/experiences'
        });
      }

      if (user.bookings.length > 0 && user.reviews.length === 0) {
        prompts.push({
          type: 'leave_review',
          title: 'Share Your Experience',
          description: 'Help others by leaving a review',
          actionText: 'Leave Review',
          actionUrl: '/dashboard/client/bookings'
        });
      }

    } else if (user.role === 'CHEF') {
      // Chef-specific prompts
      if (user.profileCompletion < 80) {
        prompts.push({
          type: 'complete_profile',
          title: 'Complete Your Chef Profile',
          description: 'Showcase your skills and experience',
          actionText: 'Update Profile',
          actionUrl: '/dashboard/chef/profile'
        });
      }

      if (!user.chefProfile?.isApproved) {
        prompts.push({
          type: 'get_approved',
          title: 'Complete Verification',
          description: 'Get approved to start receiving bookings',
          actionText: 'Complete Verification',
          actionUrl: '/dashboard/chef/profile'
        });
      }

      if ((user.chefProfile?.experiences.length || 0) === 0) {
        prompts.push({
          type: 'create_experience',
          title: 'Create Your First Experience',
          description: 'Showcase your culinary offerings',
          actionText: 'Create Experience',
          actionUrl: '/dashboard/chef/experiences'
        });
      }

      if ((user.chefProfile?.availability.length || 0) === 0) {
        prompts.push({
          type: 'set_availability',
          title: 'Set Your Availability',
          description: 'Let clients know when you\'re available',
          actionText: 'Set Availability',
          actionUrl: '/dashboard/chef/availability'
        });
      }

      if ((user.chefProfile?.proposals.length || 0) === 0 && user.profileCompletion >= 80) {
        prompts.push({
          type: 'send_proposal',
          title: 'Respond to Requests',
          description: 'Send proposals to potential clients',
          actionText: 'Browse Requests',
          actionUrl: '/dashboard/chef/requests'
        });
      }
    }

    // Return only the first 3 most relevant prompts
    const relevantPrompts = prompts.slice(0, 3);

    return NextResponse.json({ prompts: relevantPrompts });
  } catch (error) {
    console.error('Error fetching engagement prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch engagement prompts' }, { status: 500 });
  }
}
