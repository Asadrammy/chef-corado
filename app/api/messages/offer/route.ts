import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      receiverId,
      title,
      description,
      price,
      duration,
      includedServices,
      eventType,
      cuisineType,
      experienceId,
    } = body as {
      receiverId: string;
      title: string;
      description: string;
      price: string | number;
      duration?: string | number;
      includedServices?: string[] | string;
      eventType?: string;
      cuisineType?: string;
      experienceId?: string | null;
    };

    // Validate required fields
    if (!receiverId || !title || !description || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is a chef (only chefs can send offers)
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!chefProfile) {
      return NextResponse.json(
        { error: 'Only chefs can send offers' },
        { status: 403 }
      );
    }

    // Create the message first
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: `Custom Offer: ${title}`,
      },
      include: {
        sender: {
          select: {
            name: true,
          },
        },
        receiver: {
          select: {
            name: true,
          },
        },
      },
    });

    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    const numericDuration = duration != null
      ? (typeof duration === 'string' ? parseInt(duration, 10) : duration)
      : null;

    const offer = await (prisma as any).offer.create({
      data: {
        message: { connect: { id: message.id } },
        chef: { connect: { id: chefProfile.id } },
        client: { connect: { id: receiverId } },
        title,
        description,
        price: numericPrice,
        duration: numericDuration ?? undefined,
        includedServices: Array.isArray(includedServices)
          ? JSON.stringify(includedServices)
          : includedServices
          ? JSON.stringify(
              (includedServices as string)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : null,
        eventType: eventType || null,
        cuisineType: cuisineType || null,
        experienceId: experienceId || null,
      },
    });

    await prisma.message.update({
      where: { id: message.id },
      data: { offerId: offer.id },
    });

    return NextResponse.json(
      {
        message,
        offer: {
          ...offer,
          includedServices: offer.includedServices
            ? (JSON.parse(offer.includedServices) as string[])
            : [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending offer:', error);
    return NextResponse.json(
      { error: 'Failed to send offer' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('offerId');

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const offer = await (prisma as any).offer.findUnique({
      where: { id: offerId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (
      offer.clientId !== session.user.id &&
      offer.chefId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      offer: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        price: offer.price,
        duration: offer.duration ?? undefined,
        includedServices: offer.includedServices
          ? (JSON.parse(offer.includedServices) as string[])
          : [],
        eventType: offer.eventType || undefined,
        cuisineType: offer.cuisineType || undefined,
        status: offer.status as 'PENDING' | 'ACCEPTED' | 'REJECTED',
        createdAt: offer.createdAt.toISOString(),
      },
      message: offer.message,
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offer' },
      { status: 500 }
    );
  }
}
