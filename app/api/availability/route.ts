import { NextRequest, NextResponse } from 'next/server';
import { isPrismaConnectionError, prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { formatDateOnly, getDateRange, getMonthDateRange, toUtcDateOnly } from '@/lib/date-utils';

function serializeAvailability(slot: {
  id: string
  date: Date
  startTime: string
  endTime: string
  isAvailable: boolean
  maxBookings: number
  currentBookings: number
  recurringPattern: string | null
  chefId: string
  chef?: {
    user?: {
      name: string | null
      email: string | null
    }
  }
}) {
  return {
    ...slot,
    date: formatDateOnly(slot.date),
  };
}

function getLocalDemoAvailability(month?: string | null) {
  const baseDate = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
  const year = baseDate.getUTCFullYear();
  const monthIndex = baseDate.getUTCMonth();

  const makeDate = (day: number) => new Date(Date.UTC(year, monthIndex, day));

  return [
    {
      id: 'local-availability-1',
      date: formatDateOnly(makeDate(17)),
      startTime: '17:00',
      endTime: '22:00',
      isAvailable: true,
      maxBookings: 1,
      currentBookings: 0,
      recurringPattern: null,
      chefId: 'local-demo-chef',
    },
    {
      id: 'local-availability-2',
      date: formatDateOnly(makeDate(20)),
      startTime: '18:00',
      endTime: '23:00',
      isAvailable: true,
      maxBookings: 1,
      currentBookings: 1,
      recurringPattern: null,
      chefId: 'local-demo-chef',
    },
    {
      id: 'local-availability-3',
      date: formatDateOnly(makeDate(24)),
      startTime: '11:00',
      endTime: '15:00',
      isAvailable: true,
      maxBookings: 2,
      currentBookings: 0,
      recurringPattern: null,
      chefId: 'local-demo-chef',
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const requestedChefId = searchParams.get('chefId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month'); // Format: YYYY-MM

    const where: Record<string, unknown> = {};

    if (requestedChefId) {
      where.chefId = requestedChefId;
    } else if (session?.user?.id && session.user.role === Role.CHEF) {
      const chefProfile = await prisma.chefProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!chefProfile) {
        return NextResponse.json([], { status: 200 });
      }

      where.chefId = chefProfile.id;
    }

    if (startDate && endDate) {
      const { start, endExclusive } = getDateRange(startDate, endDate);
      where.date = {
        gte: start,
        lt: endExclusive,
      };
    } else if (month) {
      const { start, endExclusive } = getMonthDateRange(month);

      where.date = {
        gte: start,
        lt: endExclusive,
      };
    }

    const availability = await prisma.availability.findMany({
      where,
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(availability.map(serializeAvailability));
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      const { searchParams } = new URL(request.url);
      return NextResponse.json(getLocalDemoAvailability(searchParams.get('month')));
    }

    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'CHEF') {
      return NextResponse.json(
        { error: 'Only chefs can create availability' },
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

    const body = await request.json();
    const {
      date,
      startTime,
      endTime,
      recurringPattern,
      maxBookings,
      isAvailable,
    } = body;

    // Validate required fields
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: date, startTime, endTime' },
        { status: 400 }
      );
    }

    const normalizedDate = toUtcDateOnly(date);
    const availabilityState = typeof isAvailable === 'boolean' ? isAvailable : true;

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM format.' },
        { status: 400 }
      );
    }

    // Check if end time is after start time
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check for overlapping availability
    const overlapping = await prisma.availability.findFirst({
      where: {
        chefId: chefProfile.id,
        date: normalizedDate,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Time slot overlaps with existing availability' },
        { status: 400 }
      );
    }

    const parsedMaxBookings = maxBookings == null || maxBookings === ""
      ? (availabilityState ? 1 : 0)
      : parseInt(maxBookings)

    const availability = await prisma.availability.create({
      data: {
        date: normalizedDate,
        startTime,
        endTime,
        isAvailable: availabilityState,
        recurringPattern,
        maxBookings: Number.isFinite(parsedMaxBookings) ? parsedMaxBookings : availabilityState ? 1 : 0,
        chefId: chefProfile.id,
      },
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(serializeAvailability(availability), { status: 201 });
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Availability changes are unavailable in local demo mode' },
        { status: 503 }
      );
    }

    console.error('Error creating availability:', error);
    return NextResponse.json(
      { error: 'Failed to create availability' },
      { status: 500 }
    );
  }
}
