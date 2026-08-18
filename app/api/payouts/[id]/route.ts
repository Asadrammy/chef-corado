import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { payoutService } from '@/lib/services/payout-service';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { Role } from '@/types';

const processPayoutSchema = z.object({
  action: z.enum(['approve', 'process', 'pay', 'complete', 'fail', 'cancel', 'retry']),
  externalReference: z.string().trim().min(1).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  failureReason: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession(Role.ADMIN);
    const { id } = await params;
    const body = await request.json();
    const payload = processPayoutSchema.parse(body);
    const updatedPayout = await payoutService.updatePayoutStatus(id, {
      ...payload,
      processedBy: getSessionUserId(session),
    });
    return NextResponse.json(updatedPayout);
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYOUT_NOT_FOUND') {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'EXTERNAL_REFERENCE_REQUIRED') {
      return NextResponse.json({ error: 'External payment reference is required before marking a manual payout paid.' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'PAYOUT_ONBOARDING_REQUIRED') {
      return NextResponse.json({ error: 'Complete Stripe onboarding to receive payout.' }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith('INVALID_PAYOUT_TRANSITION')) {
      return NextResponse.json({ error: 'Invalid payout status transition' }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return handleApiError(error, 'Payout PATCH');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession([Role.CHEF, Role.ADMIN]);
    const { id } = await params;
    const payout = await payoutService.getPayoutById(id);
    if (session.user.role !== Role.ADMIN && payout.chef.userId !== getSessionUserId(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(payout);
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYOUT_NOT_FOUND') {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    return handleApiError(error, 'Payout GET');
  }
}
