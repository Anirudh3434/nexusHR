import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectDocument from '@/models/ProjectDocument';
import ProjectNote from '@/models/ProjectNote';
import ProjectCredential from '@/models/ProjectCredential';
import ProjectResource from '@/models/ProjectResource';
import Project from '@/models/Project';
import { getAuthInfo } from '@/lib/auth-util';

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET - Global search across all project docs
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const query = (searchParams.get('q') || '').slice(0, 128);
    const type = searchParams.get('type'); // 'all', 'documents', 'notes', 'credentials', 'resources'

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ message: 'Search query is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const searchRegex = new RegExp(escapeRegExp(query), 'i');
    const results: any = {
      documents: [],
      notes: [],
      credentials: [],
      resources: []
    };

    // Search documents
    if (!type || type === 'all' || type === 'documents') {
      results.documents = await ProjectDocument.find({
        projectId,
        isDeleted: false,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { notes: searchRegex },
          { tags: searchRegex }
        ]
      }).select('title description category fileName uploadedAt isFavorite').limit(20);
    }

    // Search notes
    if (!type || type === 'all' || type === 'notes') {
      results.notes = await ProjectNote.find({
        projectId,
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { tags: searchRegex }
        ]
      }).select('title content category isPinned isFavorite updatedAt').limit(20);
    }

    // Search credentials (excluding sensitive data)
    if (!type || type === 'all' || type === 'credentials') {
      const credentials = await ProjectCredential.find({
        projectId,
        $or: [
          { service: searchRegex },
          { username: searchRegex },
          { email: searchRegex },
          { tags: searchRegex }
        ]
      }).select('service environment category loginUrl username email isFavorite expiryDate').limit(20);

      // Mask sensitive fields
      results.credentials = credentials.map(cred => cred.toObject());
    }

    // Search resources
    if (!type || type === 'all' || type === 'resources') {
      results.resources = await ProjectResource.find({
        projectId,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { url: searchRegex },
          { tags: searchRegex }
        ]
      }).select('title url description category isFavorite updatedAt').limit(20);
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Error searching project docs:', error);
    return NextResponse.json({ message: 'Failed to search' }, { status: 500 });
  }
}
