import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAuthInfo } from '@/lib/auth-util';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — checked via file.size BEFORE buffering

// Server-side folder allowlist: client sends a key, server maps it to a path.
const FOLDER_ALLOWLIST: Record<string, string> = {
  avatar: 'hrm/avatars',
  resume: 'hrm/resumes',
  bill: 'hrm/bills',
  document: 'hrm/documents',
};

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain',
  'application/zip',
]);

export async function POST(req: Request) {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // Configure Cloudinary inside the handler to ensure env vars are loaded
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dhgqr0et2';
    const apiKey = process.env.CLOUDINARY_API_KEY || '146475928654719';
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log('Cloudinary config check:', { cloudName, apiKey: apiKey?.slice(0, 5) + '...', hasSecret: !!apiSecret });

    if (!apiSecret) {
      return NextResponse.json({ message: 'Cloudinary API Secret not configured' }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderKey = formData.get('folder') as string || 'document';

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Size cap BEFORE buffering into memory
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'File exceeds the 10MB limit' }, { status: 413 });
    }

    if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ message: 'File type not allowed' }, { status: 415 });
    }

    const folder = FOLDER_ALLOWLIST[folderKey];
    if (!folder) {
      return NextResponse.json({ message: 'Invalid folder' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Upload error details:', {
      message: error.message,
      cloudName: cloudinary.config().cloud_name,
      http_code: error.http_code,
      error: error
    });
    return NextResponse.json(
      { message: 'Upload failed', error: error.message },
      { status: 500 }
    );
  }
}
