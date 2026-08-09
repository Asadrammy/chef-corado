import { NextRequest, NextResponse } from 'next/server';
import { isLocalDemoSessionUser } from '@/lib/auth';
import { requireAdminPermission } from '@/lib/admin-rbac';
import { handleApiError } from '@/lib/error-handler';
import { localDemoTimeSeries } from '@/lib/local-demo-data';
import { isPrismaConnectionError } from '@/lib/prisma';
import { adminAnalyticsService } from '@/lib/services/admin-analytics-service';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission('analytics.view');

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    if (isLocalDemoSessionUser(session.userId, session.email)) {
      return NextResponse.json(localDemoTimeSeries(days, 'users'));
    }

    const result = await adminAnalyticsService.getUsersAnalytics(days)

    return NextResponse.json(result);

  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30');
      return NextResponse.json(localDemoTimeSeries(days, 'users'));
    }

    return handleApiError(error, 'Admin Analytics Users GET');
  }
}
