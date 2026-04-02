import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Simple in-memory cache for popular queries
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams);
  params.delete('page'); // Don't cache pagination
  return params.toString();
}

function getFromCache(key: string): any {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    cache.delete(key);
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  // Limit cache size
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chefId = searchParams.get('chefId');
    const cuisineType = searchParams.get('cuisineType');
    const eventType = searchParams.get('eventType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const hasAvailability = searchParams.get('hasAvailability');
    const verifiedOnly = searchParams.get('verifiedOnly');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(20, Math.max(5, parseInt(searchParams.get('limit') || '10')));

    // Check cache for non-paginated queries
    const cacheKey = getCacheKey(searchParams);
    const cachedData = getFromCache(cacheKey);
    if (cachedData && page === 1) {
      // Apply pagination to cached data
      const startIndex = (page - 1) * limit;
      const paginatedExperiences = cachedData.experiences.slice(startIndex, startIndex + limit);
      
      return NextResponse.json({
        experiences: paginatedExperiences,
        pagination: {
          page,
          limit,
          total: cachedData.total,
          pages: Math.ceil(cachedData.total / limit),
        },
        filters: {
          chefId,
          cuisineType,
          eventType,
          difficulty,
          search,
          location,
          verifiedOnly,
          hasAvailability,
          minPrice,
          maxPrice,
          sortBy,
          sortOrder,
        },
        cached: true,
      });
    }

    // Build optimized where clause
    const where: any = {
      isActive: true,
    };

    // Add filters efficiently
    if (chefId) where.chefId = chefId;
    if (cuisineType) where.cuisineType = cuisineType;
    if (eventType) where.eventType = eventType;
    if (difficulty) where.difficulty = difficulty;
    
    // Price range filtering
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Optimized search - only search in title and description for performance
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Separate chef-related filters to avoid complex joins
    let chefFilters: any = {};
    if (location) {
      chefFilters.location = { contains: location, mode: 'insensitive' };
    }
    if (verifiedOnly === 'true') {
      chefFilters.user = { verified: true };
    }

    // Availability filtering (simplified - would need date parameter for real implementation)
    if (hasAvailability === 'true') {
      // This would require joining with availability table
      // For now, we'll just return active experiences
    }

    // Build sort options
    const orderBy: any = {};
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder;
        break;
      case 'duration':
        orderBy.duration = sortOrder;
        break;
      case 'bookings':
        orderBy.bookings = { _count: sortOrder };
        break;
      case 'rating':
        // Would need to calculate average rating
        orderBy.createdAt = sortOrder; // fallback
        break;
      default:
        orderBy.createdAt = sortOrder;
    }

    // Optimized query with minimal joins
    const [experiences, total] = await Promise.all([
      prisma.experience.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          duration: true,
          eventType: true,
          cuisineType: true,
          maxGuests: true,
          minGuests: true,
          difficulty: true,
          experienceImage: true,
          createdAt: true,
          chefId: true,
          chef: {
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  name: true,
                  verified: true,
                  experienceLevel: true,
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
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.experience.count({ where }),
    ]);

    // Apply chef filters if needed (post-processing for better performance)
    let filteredExperiences = experiences;
    if (Object.keys(chefFilters).length > 0) {
      const chefIds = await prisma.chefProfile.findMany({
        where: chefFilters,
        select: { id: true },
      });
      const validChefIds = new Set(chefIds.map(c => c.id));
      filteredExperiences = experiences.filter(exp => validChefIds.has(exp.chefId));
    }

    // Cache the results for future requests
    if (page === 1 && !search) {
      setCache(cacheKey, { experiences: filteredExperiences, total });
    }

    return NextResponse.json({
      experiences: filteredExperiences,
      pagination: {
        page,
        limit,
        total: Object.keys(chefFilters).length > 0 ? filteredExperiences.length : total,
        pages: Math.ceil((Object.keys(chefFilters).length > 0 ? filteredExperiences.length : total) / limit),
      },
      filters: {
        chefId,
        cuisineType,
        eventType,
        difficulty,
        search,
        location,
        verifiedOnly,
        hasAvailability,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
      },
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching experiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'CHEF') {
      return NextResponse.json(
        { error: 'Only chefs can create experiences' },
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
      title,
      description,
      price,
      duration,
      includedServices,
      eventType,
      cuisineType,
      maxGuests,
      minGuests,
      difficulty,
      tags,
      experienceImage,
    } = body;

    // Validate required fields
    if (!title || !description || !price || !duration || !includedServices) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const experience = await prisma.experience.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        includedServices: JSON.stringify(includedServices),
        eventType,
        cuisineType,
        maxGuests: maxGuests ? parseInt(maxGuests) : null,
        minGuests: minGuests ? parseInt(minGuests) : null,
        difficulty: difficulty || 'EASY',
        tags: tags ? JSON.stringify(tags) : null,
        experienceImage,
        chefId: chefProfile.id,
      },
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                verified: true,
                experienceLevel: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(experience, { status: 201 });
  } catch (error) {
    console.error('Error creating experience:', error);
    return NextResponse.json(
      { error: 'Failed to create experience' },
      { status: 500 }
    );
  }
}
