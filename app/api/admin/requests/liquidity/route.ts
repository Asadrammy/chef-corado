import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-rbac';
import { handleApiError } from '@/lib/error-handler';
import { adminRequestService } from '@/lib/services/admin-request-service';

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission('requests.view');

    const result = await adminRequestService.getLiquidityData()

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Admin Request Liquidity GET');
  }
}
