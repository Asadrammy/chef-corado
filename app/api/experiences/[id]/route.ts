import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publicChefEligibilityWhere } from '@/lib/public-chef-view';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const experience = await prisma.experience.findFirst({
      where: {
        id,
        isActive: true,
        chef: publicChefEligibilityWhere,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        currency: true,
        duration: true,
        includedServices: true,
        eventType: true,
        cuisineType: true,
        maxGuests: true,
        minGuests: true,
        difficulty: true,
        tags: true,
        experienceImage: true,
        chefId: true,
        chef: {
          select: {
            id: true,
            userId: true,
            profileImage: true,
            bio: true,
            location: true,
            radius: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!experience) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(experience);
  } catch (error) {
    console.error('Error fetching experience:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experience' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const experience = await prisma.experience.findUnique({
      where: { id },
      include: { chef: true },
    });

    if (!experience) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    // Check if user owns this experience or is admin
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (
      experience.chefId !== chefProfile?.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Not authorized to update this experience' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      price,
      currency,
      duration,
      includedServices,
      eventType,
      cuisineType,
      maxGuests,
      minGuests,
      serviceType,
      offersCookingClasses,
      classType,
      pricePerStudent,
      difficulty,
      tags,
      experienceImage,
      isActive,
    } = body;

    const updatedExperience = await prisma.experience.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(price !== undefined && price !== '' && { price: Number(price) }),
        ...(currency && { currency }),
        ...(duration !== undefined && duration !== '' && { duration: Number(duration) }),
        ...(includedServices && { includedServices: JSON.stringify(includedServices) }),
        ...(eventType && { eventType }),
        ...(cuisineType && { cuisineType }),
        ...(maxGuests !== undefined && maxGuests !== '' && { maxGuests: Number(maxGuests) }),
        ...(minGuests !== undefined && minGuests !== '' && { minGuests: Number(minGuests) }),
        ...(serviceType && { serviceType }),
        ...(offersCookingClasses !== undefined && { offersCookingClasses: Boolean(offersCookingClasses) }),
        ...(classType !== undefined && { classType: classType || null }),
        ...(pricePerStudent !== undefined && pricePerStudent !== '' && { pricePerStudent: Number(pricePerStudent) }),
        ...(difficulty && { difficulty }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(experienceImage && { experienceImage }),
        ...(typeof isActive === 'boolean' && { isActive }),
      } as any,
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedExperience);
  } catch (error) {
    console.error('Error updating experience:', error);
    return NextResponse.json(
      { error: 'Failed to update experience' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const experience = await prisma.experience.findUnique({
      where: { id },
      include: { chef: true },
    });

    if (!experience) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    // Check if user owns this experience or is admin
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (
      experience.chefId !== chefProfile?.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Not authorized to delete this experience' },
        { status: 403 }
      );
    }

    // Check if experience has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        experienceId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete experience with active bookings' },
        { status: 400 }
      );
    }

    await prisma.experience.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience:', error);
    return NextResponse.json(
      { error: 'Failed to delete experience' },
      { status: 500 }
    );
  }
}
