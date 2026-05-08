import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { enforceUserModeration, enforceChefModeration } from '@/lib/security/moderation-guard';
import { enforceChefCompliance, enforceClientCompliance } from '@/lib/security/legal-compliance';
import { PLATFORM_DEFAULT_CURRENCY } from '@/lib/request-options';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { offerId, eventDate } = body as {
      offerId: string;
      eventDate?: string;
    };

    if (!offerId) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }

    const offer = await (prisma as any).offer.findUnique({
      where: { id: offerId },
      include: {
        message: true,
        chef: {
          include: {
            user: true,
          },
        },
        client: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (offer.clientId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await enforceUserModeration(session.user.id)
    await enforceClientCompliance(session.user.id)
    await enforceUserModeration(offer.chef.userId)
    await enforceChefCompliance(offer.chef.userId)
    await enforceChefModeration(offer.chefId)

    if (offer.status !== 'PENDING') {
      return NextResponse.json({ error: 'Offer already resolved' }, { status: 400 });
    }

    const bookingEventDate = eventDate ? new Date(eventDate) : new Date();

    const booking = await prisma.booking.create({
      data: {
        clientId: offer.clientId,
        chefId: offer.chefId,
        experienceId: offer.experienceId || undefined,
        eventDate: bookingEventDate,
        location: 'To be confirmed via chat',
        guestCount: 1,
        totalPrice: offer.price,
        currency: offer.currency || PLATFORM_DEFAULT_CURRENCY,
        bookingType: 'INSTANT',
        status: 'PENDING',
      },
    });

    const updatedOffer = await (prisma as any).offer.update({
      where: { id: offer.id },
      data: {
        status: 'ACCEPTED',
        bookingId: booking.id,
      },
    });

    await prisma.message.update({
      where: { id: offer.messageId },
      data: {
        bookingId: booking.id,
      },
    });

    // Create notifications with preference checking
    await Promise.all([
      createNotification(
        offer.chef.userId,
        'BOOKING_CREATED',
        `Your offer has been accepted by ${offer.client.name}`
      ),
      createNotification(
        offer.clientId,
        'BOOKING_CREATED',
        'Your booking has been created from the accepted offer.'
      ),
    ]);

    return NextResponse.json({
      offer: updatedOffer,
      booking,
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 });
  }
}
