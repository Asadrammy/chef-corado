import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { chefVerificationService } from '@/lib/services/chef-verification-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chefId: string }> }
) {
  try {
    const session = await getRequiredSession();
    const { chefId } = await params;
    if (session.user.role !== "ADMIN") {
      const ownProfile = await prisma.chefProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (ownProfile?.id !== chefId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    const verificationStatus = await chefVerificationService.getVerificationStatus(chefId);
    return NextResponse.json(verificationStatus);
  } catch (error) {
    if (error instanceof Error && error.message === 'CHEF_PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }
    return handleApiError(error, 'Chef Verification GET');
  }
}
