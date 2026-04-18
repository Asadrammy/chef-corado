import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'CHEF') {
      return NextResponse.json(
        { error: 'Only chefs can delete availability' },
        { status: 403 }
      );
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user?.id || '' },
    });

    if (!chefProfile) {
      return NextResponse.json(
        { error: 'Chef profile not found' },
        { status: 404 }
      );
    }

    const { id: availabilityId } = await context.params;

    // Check if availability exists and belongs to the chef
    const availability = await prisma.availability.findFirst({
      where: {
        id: availabilityId,
        chefId: chefProfile.id,
      },
    });

    if (!availability) {
      return NextResponse.json(
        { error: 'Availability not found or does not belong to you' },
        { status: 404 }
      );
    }

    // Delete the availability
    await prisma.availability.delete({
      where: { id: availabilityId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting availability:', error);
    return NextResponse.json(
      { error: 'Failed to delete availability' },
      { status: 500 }
    );
  }
}
