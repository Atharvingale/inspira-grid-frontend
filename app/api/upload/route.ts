import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getStorage, initAdmin } from '@/lib/firebase-admin';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

// POST /api/upload — authenticated Firebase Storage upload for project/message attachments.
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const scope = formData.get('scope') === 'project' ? 'projects' : 'messages';
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'A file is required' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File must be between 1 byte and 10 MB' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 415 });
    }

    initAdmin();
    const objectPath = `${scope}/${user.uid}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const storageFile = getStorage().bucket().file(objectPath);
    await storageFile.save(Buffer.from(await file.arrayBuffer()), {
      metadata: { contentType: file.type, metadata: { ownerId: user.uid, originalName: file.name } },
      resumable: false,
    });
    const [url] = await storageFile.getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
    return NextResponse.json({ success: true, data: { path: objectPath, url, name: file.name, size: file.size, type: file.type } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Upload failed:', message);
    return NextResponse.json({ success: false, error: 'Upload failed', message }, { status: 500 });
  }
});
