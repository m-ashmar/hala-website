import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Optional: Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const url = await uploadFile(file, 'custom-requests');

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[POST /api/upload]', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
