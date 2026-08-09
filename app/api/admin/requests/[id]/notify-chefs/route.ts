import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/admin-rbac';
import { handleApiError } from '@/lib/error-handler';
import { adminRequestService } from '@/lib/services/admin-request-service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminPermission('requests.modify');

    const { id: requestId } = await context.params;

    const result = await adminRequestService.notifyChefsAboutRequest(requestId)

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_NOT_FOUND') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return handleApiError(error, 'Admin Notify Chefs POST');
  }
}
