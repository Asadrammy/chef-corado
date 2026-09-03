import { NextRequest, NextResponse } from 'next/server';
import { isPrismaConnectionError, prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toUtcDateOnly } from '@/lib/date-utils';

function isValidTime(value: unknown) {
  return typeof value === "string" && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map((part) => parseInt(part, 10))
  return hours * 60 + mins
}

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
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Availability changes are unavailable in local demo mode' },
        { status: 503 }
      );
    }

    console.error('Error deleting availability:', error);
    return NextResponse.json(
      { error: 'Failed to delete availability' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'CHEF') {
      return NextResponse.json(
        { error: 'Only chefs can update availability' },
        { status: 403 }
      );
    }

    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user?.id || '' },
      select: { id: true },
    });

    if (!chefProfile) {
      return NextResponse.json(
        { error: 'Chef profile not found' },
        { status: 404 }
      );
    }

    const { id: availabilityId } = await context.params;
    const existing = await prisma.availability.findFirst({
      where: {
        id: availabilityId,
        chefId: chefProfile.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Availability not found or does not belong to you' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const startTime = body.startTime ?? existing.startTime;
    const endTime = body.endTime ?? existing.endTime;

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM format.' },
        { status: 400 }
      );
    }

    if (minutes(endTime) <= minutes(startTime)) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const isAvailable = typeof body.isAvailable === "boolean" ? body.isAvailable : existing.isAvailable;
    const maxBookings = body.maxBookings == null || body.maxBookings === ""
      ? existing.maxBookings
      : parseInt(body.maxBookings, 10);

    const updated = await prisma.availability.update({
      where: { id: availabilityId },
      data: {
        date: body.date ? toUtcDateOnly(body.date) : existing.date,
        startTime,
        endTime,
        isAvailable,
        maxBookings: Number.isFinite(maxBookings) ? maxBookings : isAvailable ? 1 : 0,
        recurringPattern: body.recurringPattern ?? null,
      },
    });

    return NextResponse.json({
      ...updated,
      date: updated.date.toISOString().slice(0, 10),
    });
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Availability changes are unavailable in local demo mode' },
        { status: 503 }
      );
    }

    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}
