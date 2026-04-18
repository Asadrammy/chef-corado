import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { payoutService } from '@/lib/services/payout-service';

const processPayoutSchema = z.object({
  action: z.enum(['process', 'complete', 'fail']),
  stripeTransferId: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, stripeTransferId } = processPayoutSchema.parse(body);
    const updatedPayout = await payoutService.updatePayoutStatus(id, action, stripeTransferId);
    return NextResponse.json(updatedPayout);
  } catch (error) {
    if (error instanceof Error && (error.message === 'PAYOUT_NOT_FOUND' || error.message === 'PAYOUT_NOT_PROCESSABLE')) {
      return NextResponse.json({ error: error.message === 'PAYOUT_NOT_FOUND' ? 'Payout not found' : 'Payout cannot be processed' }, { status: error.message === 'PAYOUT_NOT_FOUND' ? 404 : 400 });
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
    const { id } = await params;
    const payout = await payoutService.getPayoutById(id);
    return NextResponse.json(payout);
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYOUT_NOT_FOUND') {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    return handleApiError(error, 'Payout GET');
  }
}
