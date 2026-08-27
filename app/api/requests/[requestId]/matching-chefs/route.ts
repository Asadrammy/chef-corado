import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  filterEligibleChefsForRequest,
  getChefRequestDistanceKm,
} from '@/lib/chef-request-matching';
import { requestRepository } from '@/lib/repositories/request-repository';

function parseEventDates(value: string | null) {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        multiDayDates: {
          orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
        },
      }
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if user owns the request or is admin
    if (request.clientId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const candidateChefs = await requestRepository.findApprovedChefsWithCoordinates();
    const eligibleChefs = await filterEligibleChefsForRequest(
      {
        ...request,
        eventDates: parseEventDates(request.eventDates),
        multiDayDates: request.multiDayDates.map((date) => ({
          date: date.date,
          serviceType: date.serviceType,
          cuisineTypes: date.cuisineTypes,
          dietaryRequirements: date.dietaryRequirements,
        })),
      } as any,
      candidateChefs
    );

    const safeChefs = eligibleChefs
      .map((chef) => {
        const distanceKm =
          request.latitude != null &&
          request.longitude != null &&
          chef.latitude != null &&
          chef.longitude != null
            ? getChefRequestDistanceKm(
                request.latitude,
                request.longitude,
                chef.latitude,
                chef.longitude
              )
            : null;

        return {
          id: chef.id,
          name: chef.user?.name ?? 'Chef',
          distanceKm: distanceKm == null ? null : Number(distanceKm.toFixed(1)),
          radiusKm: chef.radius,
        };
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return a.name.localeCompare(b.name);
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm || a.name.localeCompare(b.name);
      });
    
    return NextResponse.json({
      count: safeChefs.length,
      matchingChefs: safeChefs.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching matching chefs:', error);
    return NextResponse.json({ error: 'Failed to fetch matching chefs' }, { status: 500 });
  }
}
