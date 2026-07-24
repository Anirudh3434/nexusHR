import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function POST(req: Request) {
  try {
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
    const folder = formData.get('folder') as string || 'hrm';

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
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
