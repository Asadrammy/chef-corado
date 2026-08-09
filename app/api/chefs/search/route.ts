import { NextRequest, NextResponse } from 'next/server';
import { isPrismaConnectionError, prisma, withPrismaReconnect } from '@/lib/prisma';
import { filterChefsByRadius, geocodeAddress } from '@/lib/geo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const cuisines = (searchParams.get('cuisines') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const serviceType = searchParams.get('serviceType') || '';
    const eventType = searchParams.get('eventType') || '';
    const dietary = (searchParams.get('dietary') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const location = searchParams.get('location') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');
    let userLat = searchParams.get('latitude');
    let userLon = searchParams.get('longitude');
    const searchRadius = searchParams.get('radius') || '50';

    // Build the where clause
    const where: any = {
      isApproved: true,
      isBanned: false,
      user: {
        role: 'CHEF',
        isBanned: false,
      },
    };

    // Search query (name, bio, location, specialties, and cuisine metadata)
    if (query) {
      where.OR = [
        {
          user: {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
        {
          bio: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          specialties: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          cuisineType: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          cuisineTypes: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (cuisines.length) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: cuisines.flatMap((cuisine) => [
            { cuisineType: { contains: cuisine, mode: 'insensitive' } },
            { cuisineTypes: { contains: cuisine, mode: 'insensitive' } },
            { specialties: { contains: cuisine, mode: 'insensitive' } },
            { bio: { contains: cuisine, mode: 'insensitive' } },
            { menus: { some: { cuisineType: { contains: cuisine, mode: 'insensitive' } } } },
            { experiences: { some: { cuisineType: { contains: cuisine, mode: 'insensitive' } } } },
          ]),
        },
      ];
    }

    if (serviceType) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { experiences: { some: { serviceType } } },
            { specialties: { contains: serviceType.replaceAll('_', ' '), mode: 'insensitive' } },
            { bio: { contains: serviceType.replaceAll('_', ' '), mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (eventType) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { menus: { some: { eventType: { contains: eventType, mode: 'insensitive' } } } },
            { experiences: { some: { eventType: { contains: eventType, mode: 'insensitive' } } } },
            { bio: { contains: eventType, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (dietary.length) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: dietary.flatMap((item) => [
            { specialties: { contains: item, mode: 'insensitive' } },
            { bio: { contains: item, mode: 'insensitive' } },
            { menus: { some: { description: { contains: item, mode: 'insensitive' } } } },
            { experiences: { some: { description: { contains: item, mode: 'insensitive' } } } },
          ]),
        },
      ];
    }

    // Location filter. Prefer radius filtering when we can resolve coordinates;
    // fall back to text matching when no coordinate source is available.
    if (location) {
      if (!userLat || !userLon) {
        const geocodedLocation = await geocodeAddress(location)
        if (geocodedLocation) {
          userLat = String(geocodedLocation.latitude)
          userLon = String(geocodedLocation.longitude)
        }
      }

      if (!userLat || !userLon) {
        where.location = {
          contains: location,
          mode: 'insensitive',
        };
      }
    }

    // Price filter (based on menu and experience prices)
    if (minPrice || maxPrice) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            {
              menus: {
                some: {
                  price: {
                    ...(minPrice && { gte: parseFloat(minPrice) }),
                    ...(maxPrice && { lte: parseFloat(maxPrice) }),
                  },
                },
              },
            },
            {
              experiences: {
                some: {
                  price: {
                    ...(minPrice && { gte: parseFloat(minPrice) }),
                    ...(maxPrice && { lte: parseFloat(maxPrice) }),
                  },
                },
              },
            },
          ],
        },
      ];
    }

    // Rating filter
    if (minRating || maxRating) {
      where.reviews = {
        some: {
          rating: {
            ...(minRating && { gte: parseInt(minRating) }),
            ...(maxRating && { lte: parseInt(maxRating) }),
          },
        },
      };
    }

    const chefs = await withPrismaReconnect(() => prisma.chefProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        menus: {
          select: {
            id: true,
            title: true,
            price: true,
            description: true,
          },
        },
        experiences: {
          select: {
            id: true,
            title: true,
            price: true,
            description: true,
            cuisineType: true,
            eventType: true,
            serviceType: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      } as any,
      orderBy: [
        {
          reviews: {
            _count: 'desc',
          },
        } as any,
        {
          user: {
            name: 'asc',
          },
        },
      ],
    }), 1);

    // Apply location-based filtering if coordinates are provided
    let filteredChefs = chefs;
    if (userLat && userLon) {
      const userLatitude = parseFloat(userLat);
      const userLongitude = parseFloat(userLon);
      const radius = parseFloat(searchRadius);

      if (Number.isFinite(userLatitude) && Number.isFinite(userLongitude) && Number.isFinite(radius)) {
        const chefsWithinRadius = filterChefsByRadius(
          chefs.map((chef: any) => ({
            id: chef.id,
            latitude: (chef as any).latitude,
            longitude: (chef as any).longitude,
            radius: chef.radius,
          })),
          userLatitude,
          userLongitude,
          radius
        );

        const chefIdsWithinRadius = new Set(chefsWithinRadius.map((c: any) => c.id));
        filteredChefs = chefs.filter((chef: any) => chefIdsWithinRadius.has(chef.id));

        // Add distance information
        filteredChefs = filteredChefs.map((chef: any) => {
          const chefWithDistance = chefsWithinRadius.find((c: any) => c.id === chef.id);
          return {
            ...chef,
            distance: chefWithDistance?.distance || null,
          } as any;
        });
      }
    }

    // Calculate average rating for each chef
    const chefsWithRating = filteredChefs.map((chef: any) => {
      const averageRating =
        chef.reviews.length > 0
          ? chef.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / chef.reviews.length
          : 0;

      return {
        ...chef,
        averageRating: parseFloat(averageRating.toFixed(1)),
        reviewCount: chef._count.reviews,
      };
    });

    // Sort by distance if available, then by rating
    chefsWithRating.sort((a: any, b: any) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return b.reviewCount - a.reviewCount;
    });

    return NextResponse.json(chefsWithRating);
  } catch (error) {
    console.error('Error searching chefs:', error);
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        { error: 'Database connection temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to search chefs' }, { status: 500 });
  }
}
