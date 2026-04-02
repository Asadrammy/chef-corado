import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistance, filterChefsByRadius } from '@/lib/geo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const location = searchParams.get('location') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');
    const userLat = searchParams.get('latitude');
    const userLon = searchParams.get('longitude');
    const searchRadius = searchParams.get('radius') || '50';

    // Build the where clause
    const where: any = {
      isApproved: true,
      user: {
        role: 'CHEF',
      },
    };

    // Search query (name, bio, location)
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
      ];
    }

    // Location filter (text-based)
    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    // Price filter (based on menu prices)
    if (minPrice || maxPrice) {
      where.menus = {
        some: {
          price: {
            ...(minPrice && { gte: parseFloat(minPrice) }),
            ...(maxPrice && { lte: parseFloat(maxPrice) }),
          },
        },
      };
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

    const chefs = await prisma.chefProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
    });

    // Apply location-based filtering if coordinates are provided
    let filteredChefs = chefs;
    if (userLat && userLon) {
      const userLatitude = parseFloat(userLat);
      const userLongitude = parseFloat(userLon);
      const radius = parseFloat(searchRadius);

      const chefsWithinRadius = filterChefsByRadius(
        chefs.map((chef: any) => ({
          id: chef.id,
          latitude: (chef as any).latitude || 0,
          longitude: (chef as any).longitude || 0,
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
    return NextResponse.json({ error: 'Failed to search chefs' }, { status: 500 });
  }
}
