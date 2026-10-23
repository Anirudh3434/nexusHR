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

function rejectDollarKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Object.keys(obj).some((k) => k.startsWith('$'));
}

const UPDATE_ALLOWLIST = ['title', 'description', 'notes', 'tags', 'category', 'isFavorite'];

// PATCH - Update document
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (rejectDollarKeys(body)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }

    const document = await ProjectDocument.findById(id);
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(document.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

    // Handle file upload for new version
    if (body.fileData) {
      const { fileData, changeNotes } = body;
      // Client-supplied userId/userName/userEmail are ignored — session identity only.

      // Upload new version to Cloudinary
      const buffer = Buffer.from(fileData.data, 'base64');
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json({ message: 'File exceeds the 10MB limit' }, { status: 413 });
      }

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: `project-docs/${document.projectId}`,
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

      // Increment version
      const newVersion = document.version + 1;

      // Add to versions array
      document.versions.push({
        version: newVersion,
        fileUrl: result.secure_url,
        fileName: fileData.name,
        fileSize: fileData.size,
        uploadedBy: actor,
        uploadedAt: new Date(),
        changeNotes
      });

      // Update current file info
      document.fileUrl = result.secure_url;
      document.fileName = fileData.name;
      document.fileSize = fileData.size;
      document.version = newVersion;
    }

    // Update other fields (explicit allowlist)
    const data: any = {};
    for (const key of UPDATE_ALLOWLIST) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (data.title !== undefined) document.title = data.title;
    if (data.description !== undefined) document.description = data.description;
    if (data.notes !== undefined) document.notes = data.notes;
    if (data.tags !== undefined) document.tags = data.tags;
    if (data.category !== undefined) document.category = data.category;
    if (data.isFavorite !== undefined) document.isFavorite = data.isFavorite;
    document.lastModifiedBy = actor;

    document.updatedAt = new Date();
    await document.save();

    return NextResponse.json({ document }, { status: 200 });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ message: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE - Soft delete document
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const permanent = searchParams.get('permanent') === 'true';

    const document = await ProjectDocument.findById(id);
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(document.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    if (permanent) {
      // Permanent delete - also delete from Cloudinary
      const publicId = document.fileUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`project-docs/${document.projectId}/${publicId}`);
      }
      await ProjectDocument.findByIdAndDelete(id);
    } else {
      // Soft delete
      document.isDeleted = true;
      document.deletedAt = new Date();
      document.deletedBy = auth.userId;
      await document.save();
    }

    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ message: 'Failed to delete document' }, { status: 500 });
  }
}
