import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { localDemoTimeSeries } from '@/lib/local-demo-data';
import { isPrismaConnectionError } from '@/lib/prisma';
import { adminAnalyticsService } from '@/lib/services/admin-analytics-service';
import { Role } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await getRequiredSession(Role.ADMIN);

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

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
