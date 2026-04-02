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
    
    // Users can only access their own profile completion, admins can access any
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: true,
        requests: true,
        bookings: true,
        reviews: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let completion = 0;
    let missingFields: string[] = [];

    if (user.role === 'CLIENT') {
      // Client profile completion criteria
      const criteria = [
        { field: 'Basic Information', completed: !!user.name, weight: 20 },
        { field: 'Email Verified', completed: user.verified, weight: 15 },
        { field: 'Profile Details', completed: user.profileCompletion >= 50, weight: 25 },
        { field: 'Request History', completed: user.requests.length > 0, weight: 20 },
        { field: 'Booking History', completed: user.bookings.length > 0, weight: 10 },
        { field: 'Review History', completed: user.reviews.length > 0, weight: 10 }
      ];

      completion = criteria.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
      missingFields = criteria.filter(item => !item.completed).map(item => item.field);

    } else if (user.role === 'CHEF') {
      // Chef profile completion criteria
      const criteria = [
        { field: 'Basic Information', completed: !!user.name, weight: 15 },
        { field: 'Email Verified', completed: user.verified, weight: 10 },
        { field: 'Chef Profile Created', completed: !!user.chefProfile, weight: 20 },
        { field: 'Profile Details Complete', completed: (user.chefProfile?.profileCompletion || 0) >= 70, weight: 20 },
        { field: 'Experience/Menu Created', completed: false, weight: 15 }, // Would check experiences/menus
        { field: 'Availability Set', completed: false, weight: 10 }, // Would check availability
        { field: 'Platform Approved', completed: user.chefProfile?.isApproved || false, weight: 10 }
      ];

      completion = criteria.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
      missingFields = criteria.filter(item => !item.completed).map(item => item.field);
    }

    return NextResponse.json({
      completion,
      missingFields
    });
  } catch (error) {
    console.error('Error calculating profile completion:', error);
    return NextResponse.json({ error: 'Failed to calculate profile completion' }, { status: 500 });
  }
}
