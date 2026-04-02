import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {};
    if (status) where.verified = status === 'APPROVED';

    const [chefs, total] = await Promise.all([
      prisma.chefProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              verified: true,
              profileCompletion: true,
              experienceLevel: true,
              createdAt: true,
              role: true,
            },
          },
          _count: {
            select: {
              experiences: true,
              bookings: true,
              reviews: true,
              menus: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chefProfile.count({ where }),
    ]);

    // Calculate profile completion for each chef
    const chefsWithCompletion = chefs.map((chef: any) => {
      const completion = calculateProfileCompletion(chef);
      return {
        ...chef,
        profileCompletion: completion,
      };
    });

    return NextResponse.json({
      chefs: chefsWithCompletion,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { chefId, action, reason } = body;

    if (!chefId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const chef = await prisma.chefProfile.findUnique({
      where: { id: chefId },
      include: {
        user: true,
      },
    });

    if (!chef) {
      return NextResponse.json(
        { error: 'Chef not found' },
        { status: 404 }
      );
    }

    // Update chef verification status
    const updatedChef = await prisma.chefProfile.update({
      where: { id: chefId },
      data: {
        verified: action === 'APPROVE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            verified: true,
          },
        },
      },
    });

    // Also update user verification status
    await prisma.user.update({
      where: { id: chef.user.id },
      data: {
        verified: action === 'APPROVE',
      },
    });

    // Create notification for chef
    await prisma.notification.create({
      data: {
        userId: chef.user.id,
        type: action === 'APPROVE' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
        message: action === 'APPROVE' 
          ? 'Congratulations! Your chef profile has been verified.'
          : `Your verification request was rejected. ${reason ? `Reason: ${reason}` : ''}`,
      },
    });

    return NextResponse.json({
      chef: updatedChef,
      message: `Chef ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    return NextResponse.json(
      { error: 'Failed to update verification status' },
      { status: 500 }
    );
  }
}

// Helper function to calculate profile completion
function calculateProfileCompletion(chef: any): number {
  let completion = 0;
  const maxFields = 10;

  // Basic profile fields (40%)
  if (chef.bio) completion += 1;
  if (chef.experience) completion += 1;
  if (chef.location) completion += 1;
  if (chef.profileImage) completion += 1;
  if (chef.cuisineType) completion += 1;

  // Experience content (30%)
  if (chef._count.experiences > 0) completion += 1;
  if (chef._count.experiences >= 3) completion += 1;

  // Business activity (20%)
  if (chef._count.bookings > 0) completion += 1;
  if (chef._count.reviews > 0) completion += 1;

  // Verification (10%)
  if (chef.user.verified) completion += 1;

  return Math.round((completion / maxFields) * 100);
}
