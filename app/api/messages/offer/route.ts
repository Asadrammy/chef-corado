import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateMessageContent } from '@/lib/security/communication-policy';
import { enforceUserModeration, enforceChefModeration } from '@/lib/security/moderation-guard';
import { enforceChefCompliance, enforceClientCompliance } from '@/lib/security/legal-compliance';
import { PLATFORM_DEFAULT_CURRENCY } from '@/lib/request-options';
import { assertRequestCanReceiveQuote } from '@/lib/services/quote-limit-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id

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
      requestId,
      currency,
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
      requestId?: string | null;
      currency?: string | null;
    };

    // Validate required fields
    if (!receiverId || !title || !description || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Enforce moderation
    await enforceUserModeration(userId)
    await enforceUserModeration(receiverId)
    await enforceClientCompliance(receiverId)

    // Enforce communication policy on offer content
    validateMessageContent(title)
    validateMessageContent(description)

    // Enforce chef compliance (terms + insurance)
    await enforceChefCompliance(userId)

    // Check if user is a chef (only chefs can send offers)
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
    });

    if (!chefProfile) {
      return NextResponse.json(
        { error: 'Only chefs can send offers' },
        { status: 403 }
      );
    }

    // Enforce chef profile moderation
    await enforceChefModeration(chefProfile.id)

    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    const numericDuration = duration != null
      ? (typeof duration === 'string' ? parseInt(duration, 10) : duration)
      : null;

    const linkedRequest = requestId
      ? await prisma.request.findFirst({
          where: {
            id: requestId,
            clientId: receiverId,
          },
          select: {
            id: true,
            currency: true,
          },
        })
      : await prisma.request.findFirst({
          where: {
            clientId: receiverId,
            proposals: {
              some: {
                chef: {
                  userId,
                },
              },
            },
          },
          select: {
            id: true,
            currency: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

    const resolvedCurrency = linkedRequest?.currency || currency || chefProfile.preferredCurrency || PLATFORM_DEFAULT_CURRENCY

    // Enforce unified quote limit outside transaction (for atomic check)
    if (linkedRequest?.id) {
      await assertRequestCanReceiveQuote(linkedRequest.id)
    }

    const { message, offer } = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          senderId: userId,
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
      })

      const offer = await (tx as any).offer.create({
        data: {
          message: { connect: { id: message.id } },
          chef: { connect: { id: chefProfile.id } },
          client: { connect: { id: receiverId } },
          title,
          description,
          price: numericPrice,
          currency: resolvedCurrency,
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
          requestId: linkedRequest?.id || requestId || null,
        },
      })

      await tx.message.update({
        where: { id: message.id },
        data: { offerId: offer.id },
      })

      return { message, offer }
    }, {
      isolationLevel: 'Serializable',
    })

    return NextResponse.json(
      {
        message,
        offer: {
          ...offer,
          currency: offer.currency ?? resolvedCurrency,
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

    const userId = session.user.id;

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
      offer.clientId !== userId &&
      offer.chefId !== userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      offer: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        price: offer.price,
        currency: offer.currency ?? PLATFORM_DEFAULT_CURRENCY,
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
