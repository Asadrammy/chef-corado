import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-rbac';
import { handleApiError } from '@/lib/error-handler';
import { adminVerificationService } from '@/lib/services/admin-verification-service';

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission('certificates.view');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const result = await adminVerificationService.listVerificationQueue(status, page, limit)

    return NextResponse.json({
      chefs: result.chefs,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiError(error, 'Admin Verification GET');
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminPermission('certificates.review');

    const body = await request.json();
    const { chefId, action, reason } = body;

    if (!chefId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
    const result = await adminVerificationService.updateVerificationStatus(chefId, action, reason, actor.userId)

    return NextResponse.json({
      chef: result.chef,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CHEF_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Chef not found' },
        { status: 404 }
      );
    }

    return handleApiError(error, 'Admin Verification POST');
  }
}
