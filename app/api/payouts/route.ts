import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { payoutService } from '@/lib/services/payout-service';
import { Role } from '@/types';
import { applyRateLimit } from '@/lib/redis-rate-limiter';
import { enforceChefCompliance } from '@/lib/security/legal-compliance';

const createPayoutSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  // Apply rate limiting for payout requests
  const rateLimitResult = await applyRateLimit(request, 'payouts');
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  try {
    const session = await getRequiredSession(Role.CHEF);
    const userId = getSessionUserId(session);

    // Enforce chef compliance (terms + insurance) before allowing payouts
    await enforceChefCompliance(userId);

    const body = await request.json();
    const { amount } = createPayoutSchema.parse(body);
    const payout = await payoutService.createPayout(userId, amount);
    return NextResponse.json(payout);
  } catch (error) {
    if (error instanceof Error && error.message === 'CHEF_PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'CHEF_NOT_APPROVED') {
      return NextResponse.json({ error: 'Chef account not approved' }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const available = error.message.split(':')[1];
      return NextResponse.json({ 
        error: `Insufficient balance. Available: $${available}` 
      }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return handleApiError(error, 'Payouts POST');
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession([Role.CHEF, Role.ADMIN]);
    const { searchParams } = new URL(request.url);
    const chefId = searchParams.get('chefId');
    
    // Chefs can only view their own payouts unless they are admins
    if (session.user.role === Role.CHEF) {
      if (chefId && chefId !== getSessionUserId(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Force to their own chef profile
      const ownPayouts = await payoutService.listPayouts(getSessionUserId(session), searchParams.get('status') || undefined);
      return NextResponse.json(ownPayouts);
    }
    
    // Admins can view any payouts
    const payouts = await payoutService.listPayouts(chefId || undefined, searchParams.get('status') || undefined);
    return NextResponse.json(payouts);
  } catch (error) {
    return handleApiError(error, 'Payouts GET');
  }
}
