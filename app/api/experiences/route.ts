import { NextRequest, NextResponse } from 'next/server';
import { isPrismaConnectionError, prisma, withPrismaReconnect } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { experienceSchema } from '@/lib/validation-schemas';
import { enforceUserModeration } from '@/lib/security/moderation-guard';
import { enforceChefCompliance } from '@/lib/security/legal-compliance';
import { validatePolicyFields } from '@/lib/security/communication-policy';

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
    const minGuests = searchParams.get('minGuests');
    const maxGuests = searchParams.get('maxGuests');
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
      chef: {
        isApproved: true,
        isBanned: false,
        user: {
          isBanned: false,
        },
      },
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

    // Guest count filtering
    if (minGuests || maxGuests) {
      where.maxGuests = {};
      if (minGuests) where.maxGuests.gte = parseInt(minGuests);
      if (maxGuests) where.maxGuests.lte = parseInt(maxGuests);
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

    const { experiences, total, filteredExperiences } = await withPrismaReconnect(async () => {
      // Keep these sequential so a closed DB connection does not produce duplicate parallel errors.
      const experiences = await prisma.experience.findMany({
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
        });

      const total = await prisma.experience.count({ where });

      let filteredExperiences = experiences;
      if (Object.keys(chefFilters).length > 0) {
        const chefIds = await prisma.chefProfile.findMany({
          where: chefFilters,
          select: { id: true },
        });
        const validChefIds = new Set(chefIds.map(c => c.id));
        filteredExperiences = experiences.filter(exp => validChefIds.has(exp.chefId));
      }

      return {
        experiences,
        total,
        filteredExperiences,
      };
    }, 1);

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
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        {
          error: 'Database connection temporarily unavailable',
          experiences: [],
          pagination: { page: 1, limit: 12, total: 0, pages: 0 },
        },
        { status: 503 }
      );
    }

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

    await enforceUserModeration(session.user.id || '');
    await enforceChefCompliance(session.user.id || '');

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

    validatePolicyFields({
      title: body.title,
      description: body.description,
      tags: Array.isArray(body.tags) ? body.tags.join(', ') : body.tags,
    });

    const validated = experienceSchema.parse({
      ...body,
      price: Number(body.price),
      duration: Number(body.duration),
      maxGuests: body.maxGuests ? Number(body.maxGuests) : undefined,
      minGuests: body.minGuests ? Number(body.minGuests) : undefined,
      pricePerStudent: body.pricePerStudent ? Number(body.pricePerStudent) : undefined,
    });

    const experience = await prisma.experience.create({
      data: {
        title: validated.title,
        description: validated.description,
        price: validated.price,
        currency: validated.currency,
        duration: validated.duration,
        includedServices: JSON.stringify(body.includedServices || []),
        eventType: validated.eventType,
        cuisineType: validated.cuisineType,
        maxGuests: validated.maxGuests ?? null,
        minGuests: validated.minGuests ?? null,
        serviceType: validated.serviceType,
        offersCookingClasses: validated.offersCookingClasses ?? validated.serviceType === 'COOKING_CLASS',
        classType: validated.classType ?? null,
        pricePerStudent: validated.pricePerStudent ?? null,
        difficulty: validated.difficulty || 'EASY',
        tags: body.tags ? JSON.stringify(body.tags) : null,
        experienceImage: validated.experienceImage,
        chefId: chefProfile.id,
      } as any,
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
