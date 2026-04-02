import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateDistance } from '@/lib/geo';

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

    // Get the request details
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if user owns the request or is admin
    if (request.clientId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find matching chefs based on request criteria
    const matchingChefs = await prisma.chefProfile.findMany({
      where: {
        isApproved: true,
        isBanned: false,
        latitude: { not: null },
        longitude: { not: null },
        // Match by experiences
        experiences: {
          some: {
            isActive: true
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        experiences: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            title: true,
            price: true,
            eventType: true,
            cuisineType: true
          }
        }
      }
    });

    // Filter and score chefs based on matching criteria
    const scoredChefs = matchingChefs.map(chef => {
      let score = 0;

      // Base score for being approved
      score += 10;

      // Location match using real distance calculation
      if (request.latitude && request.longitude && chef.latitude && chef.longitude) {
        const distance = calculateDistance(
          request.latitude,
          request.longitude,
          chef.latitude,
          chef.longitude
        );
        if (distance <= chef.radius) {
          score += 20;
        }
      }

      // Cuisine type match (based on chef's experiences and request description)
      const hasCuisineMatch = chef.experiences.some(exp => 
        exp.cuisineType && request.description && 
        request.description.toLowerCase().includes(exp.cuisineType.toLowerCase())
      );
      if (hasCuisineMatch) {
        score += 15;
      }

      // Event type match (using description field to extract event type)
      const hasMatchingExperience = chef.experiences.some(exp => 
        exp.eventType && request.description && 
        request.description.toLowerCase().includes(exp.eventType.toLowerCase())
      );
      if (hasMatchingExperience) {
        score += 15;
      }

      // Budget match (if specified)
      if (request.budget) {
        const hasAffordableExperience = chef.experiences.some(exp => 
          exp.price <= request.budget!
        );
        if (hasAffordableExperience) {
          score += 10;
        }
      }

      // Experience level bonus
      if (chef.experienceLevel === 'EXPERT') score += 5;
      else if (chef.experienceLevel === 'INTERMEDIATE') score += 3;

      // Verification bonus
      if (chef.verified) score += 5;

      return {
        ...chef,
        matchScore: score
      };
    });

    // Sort by match score and return count
    const sortedChefs = scoredChefs.sort((a, b) => b.matchScore - a.matchScore);
    
    return NextResponse.json({
      count: sortedChefs.length,
      matchingChefs: sortedChefs.slice(0, 10) // Return top 10 for preview
    });
  } catch (error) {
    console.error('Error fetching matching chefs:', error);
    return NextResponse.json({ error: 'Failed to fetch matching chefs' }, { status: 500 });
  }
}
