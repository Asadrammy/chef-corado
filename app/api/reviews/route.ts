import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  bookingId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rating, comment, bookingId } = createReviewSchema.parse(body);

    // Get the booking and verify it exists and is completed
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        chef: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if review already exists
    const existingReview = await (prisma as any).review.findFirst({
      where: { bookingId },
    });

    if (existingReview) {
      return NextResponse.json({ error: 'Review already exists for this booking' }, { status: 400 });
    }

    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Booking must be completed to leave a review' }, { status: 400 });
    }

    // Create the review
    const review = await (prisma as any).review.create({
      data: {
        rating,
        comment,
        clientId: booking.clientId,
        chefId: booking.chefId,
        bookingId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chefId = searchParams.get('chefId');

    if (!chefId) {
      return NextResponse.json({ error: 'Chef ID is required' }, { status: 400 });
    }

    const reviews = await (prisma as any).review.findMany({
      where: { chefId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length 
      : 0;

    return NextResponse.json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
