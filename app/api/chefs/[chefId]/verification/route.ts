import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chefId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chefId } = await params;

    // Get chef profile with verification details
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: chefId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            verified: true
          }
        }
      }
    });

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    // Calculate verification status based on available data
    const verificationStatus = {
      identityVerified: chefProfile.verified || false,
      backgroundChecked: chefProfile.isApproved || false,
      documentsUploaded: false, // Would need document model in real system
      referencesChecked: chefProfile.isApproved || false,
      lastVerified: chefProfile.updatedAt,
      verificationLevel: chefProfile.verified && chefProfile.isApproved ? 'FULL' : 
                        chefProfile.isApproved ? 'BASIC' : 'PENDING'
    };

    return NextResponse.json(verificationStatus);
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}
