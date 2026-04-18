import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { chefActivityService } from '@/lib/services/chef-activity-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chefId: string }> }
) {
  try {
    await getRequiredSession();
    const { chefId } = await params;
    const activityStatus = await chefActivityService.getActivityStatus(chefId);
    return NextResponse.json(activityStatus);
  } catch (error) {
    if (error instanceof Error && error.message === 'CHEF_PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }
    return handleApiError(error, 'Chef Activity GET');
  }
}
