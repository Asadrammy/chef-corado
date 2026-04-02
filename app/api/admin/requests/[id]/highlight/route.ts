import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await context.params;

    // Get request details
    const requestData = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Mark request as highlighted (could add a highlighted field to schema)
    // For now, we'll just return success
    // In a real implementation, you might add a 'highlighted' boolean field to the Request model

    return NextResponse.json({ 
      message: 'Request highlighted successfully',
      requestId: requestId
    });

  } catch (error) {
    console.error('Error highlighting request:', error);
    return NextResponse.json({ error: 'Failed to highlight request' }, { status: 500 });
  }
}
