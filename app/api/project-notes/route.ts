import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectNote from '@/models/ProjectNote';
import Project from '@/models/Project';
import { headers } from 'next/headers';
import { getAuthInfo } from '@/lib/auth-util';

async function getDisplayName(): Promise<string> {
  try { return (await headers()).get('x-user-name') || ''; } catch { return ''; }
}

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

// GET - Fetch all notes for a project
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
    const isPinned = searchParams.get('isPinned');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const query: any = { projectId };

    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isFavorite === 'true') query.isFavorite = true;
    if (isPinned === 'true') query.isPinned = true;

    const notes = await ProjectNote.find(query)
      .sort({ isPinned: -1, updatedAt: -1 });

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ message: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST - Create a new note
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (rejectDollarKeys(body)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }
    const { projectId, title, content, tags, category, isPinned, isFavorite } = body;
    // Client-supplied userId/userName/userEmail are ignored — session identity only.

    if (!projectId || !title || !content) {
      return NextResponse.json({ message: 'Project ID, title, and content are required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

    const note = await ProjectNote.create({
      projectId,
      title,
      content,
      tags: tags || [],
      category: category || 'Other',
      isPinned: isPinned || false,
      isFavorite: isFavorite || false,
      versions: [{
        version: 1,
        content,
        editedBy: actor,
        editedAt: new Date()
      }],
      createdBy: actor,
      lastEditedBy: actor
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ message: 'Failed to create note' }, { status: 500 });
  }
}
