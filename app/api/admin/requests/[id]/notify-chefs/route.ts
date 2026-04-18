import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { adminRequestService } from '@/lib/services/admin-request-service';
import { Role } from '@/types';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getRequiredSession(Role.ADMIN);

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
