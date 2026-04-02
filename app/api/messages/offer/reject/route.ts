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
    const { offerId } = body as { offerId: string };

    if (!offerId) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }

    const offer = await (prisma as any).offer.findUnique({
      where: { id: offerId },
      include: {
        chef: {
          include: {
            user: true,
          },
        },
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

    const updatedOffer = await (prisma as any).offer.update({
      where: { id: offer.id },
      data: {
        status: 'REJECTED',
      },
    });

    await prisma.notification.create({
      data: {
        userId: offer.chef.userId,
        type: 'PROPOSAL_REJECTED',
        message: 'An offer you sent was declined by the client.',
      },
    });

    return NextResponse.json({ offer: updatedOffer });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    return NextResponse.json({ error: 'Failed to reject offer' }, { status: 500 });
  }
}
