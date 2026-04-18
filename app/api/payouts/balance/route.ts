import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { payoutService } from '@/lib/services/payout-service';
import { Role } from '@/types';

export async function GET() {
  try {
    const session = await getRequiredSession(Role.CHEF);
    const userId = getSessionUserId(session);
    const balance = await payoutService.getPayoutBalance(userId);
    return NextResponse.json(balance);
  } catch (error) {
    if (error instanceof Error && error.message === 'CHEF_PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }
    return handleApiError(error, 'Payout Balance GET');
  }
}
