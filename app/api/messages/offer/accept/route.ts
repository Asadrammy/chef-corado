import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    await prisma.notification.create({
      data: {
        userId: offer.chef.userId,
        type: 'BOOKING_CREATED',
        message: `Your offer has been accepted by ${offer.client.name}`,
      },
    });

    await prisma.notification.create({
      data: {
        userId: offer.clientId,
        type: 'BOOKING_CREATED',
        message: 'Your booking has been created from the accepted offer.',
      },
    });

    return NextResponse.json({
      offer: updatedOffer,
      booking,
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 });
  }
}
