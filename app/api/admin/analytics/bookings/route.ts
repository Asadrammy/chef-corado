import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { adminAnalyticsService } from '@/lib/services/admin-analytics-service';
import { Role } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await getRequiredSession(Role.ADMIN);

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const result = await adminAnalyticsService.getBookingsAnalytics(days)

    return NextResponse.json(result);

  } catch (error) {
    return handleApiError(error, 'Admin Analytics Bookings GET');
  }
}
