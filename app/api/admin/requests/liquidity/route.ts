import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { adminRequestService } from '@/lib/services/admin-request-service';
import { Role } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await getRequiredSession(Role.ADMIN);

    const result = await adminRequestService.getLiquidityData()

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Admin Request Liquidity GET');
  }
}
