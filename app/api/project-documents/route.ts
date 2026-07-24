import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectDocument from '@/models/ProjectDocument';
import Project from '@/models/Project';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET - Fetch all documents for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const isFavorite = searchParams.get('isFavorite');
    const isDeleted = searchParams.get('isDeleted');
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const query: any = { projectId };
    
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isFavorite === 'true') query.isFavorite = true;
    if (isDeleted === 'true') query.isDeleted = true;
    else query.isDeleted = false;

    const documents = await ProjectDocument.find(query)
      .sort({ isFavorite: -1, updatedAt: -1 });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ message: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST - Upload a new document
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const notes = formData.get('notes') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;
    const userEmail = formData.get('userEmail') as string;

    if (!file || !projectId) {
      return NextResponse.json({ message: 'File and Project ID are required' }, { status: 400 });
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          resource_type: 'auto',
          folder: `project-docs/${projectId}`,
          use_filename: true,
          unique_filename: true
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const result = uploadResult as any;

    const document = await ProjectDocument.create({
      projectId,
      title: title || file.name,
      description,
      notes,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      category: category || 'Other',
      fileUrl: result.secure_url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      version: 1,
      versions: [{
        version: 1,
        fileUrl: result.secure_url,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: { _id: userId, name: userName, email: userEmail },
        uploadedAt: new Date()
      }],
      uploadedBy: { _id: userId, name: userName, email: userEmail },
      lastModifiedBy: { _id: userId, name: userName, email: userEmail }
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ message: 'Failed to upload document' }, { status: 500 });
  }
}
