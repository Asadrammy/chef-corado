import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-rbac';
import { handleApiError } from '@/lib/error-handler';
import { adminUserService } from '@/lib/services/admin-user-service';

const banUserSchema = z.object({
  userId: z.string(),
  action: z.enum(['ban', 'unban']),
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, reason, adminNotes } = banUserSchema.parse(body);
    const session = await requireAdminPermission(action === 'ban' ? 'users.ban' : 'users.suspend');
    const result = await adminUserService.updateUserBanStatus(userId, action, {
      reason,
      adminNotes,
      bannedBy: session.userId,
    });

    return NextResponse.json({
      user: result.user,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }

    return handleApiError(error, 'Admin Users POST');
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission('users.view');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'banned', 'active', 'flagged'
    const role = searchParams.get('role'); // 'CLIENT', 'CHEF', 'ADMIN'
    const users = await adminUserService.listUsers(status, role);

    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error, 'Admin Users GET');
  }
}
