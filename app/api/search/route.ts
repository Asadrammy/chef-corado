import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['chefs', 'requests', 'all']).default('all'),
  location: z.string().optional(),
  radius: z.number().min(1).max(500).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      query: searchParams.get('query') || '',
      type: searchParams.get('type') || 'all',
      location: searchParams.get('location') || undefined,
      radius: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const validated = searchSchema.parse(params);
    const { query, type, location, radius, minPrice, maxPrice, page, limit } = validated;
    const skip = (page - 1) * limit;

    let centerLat: number | undefined;
    let centerLon: number | undefined;

    // If location is provided, try to geocode it (simplified approach)
    if (location) {
      // In production, you'd use a proper geocoding service
      // For now, we'll use a simple lookup for major cities
      const cityCoords: Record<string, { lat: number; lon: number }> = {
        'new york': { lat: 40.7128, lon: -74.0060 },
        'los angeles': { lat: 34.0522, lon: -118.2437 },
        'chicago': { lat: 41.8781, lon: -87.6298 },
        'houston': { lat: 29.7604, lon: -95.3698 },
        'philadelphia': { lat: 39.9526, lon: -75.1652 },
        'phoenix': { lat: 33.4484, lon: -112.0740 },
        'san antonio': { lat: 29.4241, lon: -98.4936 },
        'san diego': { lat: 32.7157, lon: -117.1611 },
        'dallas': { lat: 32.7767, lon: -96.7970 },
        'san jose': { lat: 37.3382, lon: -121.8863 },
      };

      const normalizedLocation = location.toLowerCase();
      if (cityCoords[normalizedLocation]) {
        centerLat = cityCoords[normalizedLocation].lat;
        centerLon = cityCoords[normalizedLocation].lon;
      }
    }

    const results: any = {
      chefs: [],
      requests: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };

    // Search chefs
    if (type === 'chefs' || type === 'all') {
      const chefWhere: any = {
        isApproved: true,
        isBanned: false,
        user: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
      };

      // Add location filter if coordinates are available
      if (centerLat && centerLon && radius) {
        // We'll filter by distance after fetching
        chefWhere.latitude = { not: null };
        chefWhere.longitude = { not: null };
      }

      const chefs = await (prisma as any).chefProfile.findMany({
        where: chefWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          menus: {
            where: minPrice || maxPrice ? {
              price: {
                ...(minPrice && { gte: minPrice }),
                ...(maxPrice && { lte: maxPrice }),
              },
            } : undefined,
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              menuImage: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        skip,
        take: limit,
      });

      // Filter by distance if needed
      let filteredChefs = chefs;
      if (centerLat && centerLon && radius) {
        filteredChefs = chefs.filter((chef: any) => {
          if (!chef.latitude || !chef.longitude) return false;
          const distance = calculateDistance(centerLat, centerLon, chef.latitude, chef.longitude);
          return distance <= radius;
        });
      }

      // Calculate average ratings
      const chefsWithRating = filteredChefs.map((chef: any) => ({
        ...chef,
        averageRating: chef.reviews.length > 0 
          ? chef.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / chef.reviews.length 
          : 0,
        reviewCount: chef.reviews.length,
        reviews: undefined, // Remove reviews array from response
      }));

      results.chefs = chefsWithRating;
    }

    // Search requests
    if (type === 'requests' || type === 'all') {
      const requestWhere: any = {
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      };

      // Add price filter
      if (minPrice || maxPrice) {
        requestWhere.budget = {
          ...(minPrice && { gte: minPrice }),
          ...(maxPrice && { lte: maxPrice }),
        };
      }

      // Add location filter if coordinates are available
      if (centerLat && centerLon && radius) {
        requestWhere.latitude = { not: null };
        requestWhere.longitude = { not: null };
      }

      const requests = await (prisma as any).request.findMany({
        where: requestWhere,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          proposals: {
            select: {
              id: true,
              price: true,
            },
          },
        },
        skip,
        take: limit,
      });

      // Filter by distance if needed
      let filteredRequests = requests;
      if (centerLat && centerLon && radius) {
        filteredRequests = requests.filter((request: any) => {
          if (!request.latitude || !request.longitude) return false;
          const distance = calculateDistance(centerLat, centerLon, request.latitude, request.longitude);
          return distance <= radius;
        });
      }

      results.requests = filteredRequests;
    }

    // Calculate pagination
    const totalResults = results.chefs.length + results.requests.length;
    results.pagination.total = totalResults;
    results.pagination.totalPages = Math.ceil(totalResults / limit);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
