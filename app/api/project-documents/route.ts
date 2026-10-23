import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectDocument from '@/models/ProjectDocument';
import Project from '@/models/Project';
import { v2 as cloudinary } from 'cloudinary';
import { headers } from 'next/headers';
import { getAuthInfo } from '@/lib/auth-util';

async function getDisplayName(): Promise<string> {
  try { return (await headers()).get('x-user-name') || ''; } catch { return ''; }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

interface AuthCtx { userId: string; role: string; companyId?: string; email?: string; name?: string }

async function requireProjectAccess(projectId: string, auth: AuthCtx) {
  const project = await Project.findById(projectId).select('companyId managerId members');
  if (!project) return { error: 'Project not found', status: 404 as const };
  if (!auth.companyId || project.companyId.toString() !== auth.companyId) {
    return { error: "Forbidden: Access to another company's project is not allowed", status: 403 as const };
  }
  const userRole = auth.role || 'employee';
  if (userRole === 'employee') {
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === auth.userId
    );
    if (!isMember) return { error: 'Forbidden: You are not a member of this project', status: 403 as const };
  } else if (userRole === 'manager') {
    const isManager = project.managerId && project.managerId.toString() === auth.userId;
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === auth.userId
    );
    if (!isManager && !isMember) {
      return { error: 'Forbidden: You do not manage or belong to this project', status: 403 as const };
    }
  }
  return { project };
}

// GET - Fetch all documents for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const isFavorite = searchParams.get('isFavorite');
    const isDeleted = searchParams.get('isDeleted');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const notes = formData.get('notes') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    // Client-supplied identity is ignored — identity always comes from the session.

    if (!file || !projectId) {
      return NextResponse.json({ message: 'File and Project ID are required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'File exceeds the 10MB limit' }, { status: 413 });
    }
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ message: 'File type not allowed' }, { status: 415 });
    }

    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

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
        uploadedBy: actor,
        uploadedAt: new Date()
      }],
      uploadedBy: actor,
      lastModifiedBy: actor
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ message: 'Failed to upload document' }, { status: 500 });
  }
}
