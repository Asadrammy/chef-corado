import { NextRequest, NextResponse } from 'next/server';
import { isLocalDemoSessionUser } from '@/lib/auth';
import { getRequiredSession } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { localDemoTimeSeries } from '@/lib/local-demo-data';
import { isPrismaConnectionError } from '@/lib/prisma';
import { adminAnalyticsService } from '@/lib/services/admin-analytics-service';
import { Role } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession(Role.ADMIN);

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    if (isLocalDemoSessionUser(session.user.id, session.user.email)) {
      return NextResponse.json(localDemoTimeSeries(days, 'revenue'));
    }

    const result = await adminAnalyticsService.getRevenueAnalytics(days)

    return NextResponse.json(result);

  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === 'development') {
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30');
      return NextResponse.json(localDemoTimeSeries(days, 'revenue'));
    }

    return handleApiError(error, 'Admin Analytics Revenue GET');
  }
}
