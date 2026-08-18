import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import {
  uploadImageFile,
} from '@/lib/image-upload-storage';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const purpose = formData.get('purpose') === 'profile' ? 'profile' : 'menu';
    const uploaded = await uploadImageFile({
      file,
      ownerId: session.user.id,
      purpose,
    });

    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      storage: uploaded.storage,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_IMAGE_TYPE') {
        return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 });
      }
      if (error.message === 'IMAGE_TOO_LARGE') {
        return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
      }
      if (error.message === 'DURABLE_IMAGE_STORAGE_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'Durable image storage is not configured.' }, { status: 503 });
      }
    }

    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
