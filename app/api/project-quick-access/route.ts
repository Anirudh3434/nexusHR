import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectQuickAccess from '@/models/ProjectQuickAccess';
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

// GET - Fetch all quick access links for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const items = await ProjectQuickAccess.find({ projectId }).sort({ createdAt: 1 });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('Error fetching quick access items:', error);
    return NextResponse.json({ message: 'Failed to fetch quick access items' }, { status: 500 });
  }
}

// POST - Create or update a quick access link
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, title, url, id } = body;

    if (!projectId || !title || !url) {
      return NextResponse.json({ message: 'Project ID, title, and URL are required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    let item;
    if (id) {
      // Scope the update to the same project (tenant isolation)
      item = await ProjectQuickAccess.findOneAndUpdate(
        { _id: id, projectId },
        { title, url },
        { new: true }
      );
      if (!item) return NextResponse.json({ message: 'Item not found' }, { status: 404 });
    } else {
      item = await ProjectQuickAccess.create({
        projectId,
        title,
        url
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error saving quick access item:', error);
    return NextResponse.json({ message: 'Failed to save quick access item' }, { status: 500 });
  }
}

// DELETE - Delete a quick access link
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Item ID is required' }, { status: 400 });
    }

    const existing = await ProjectQuickAccess.findById(id);
    if (!existing) {
      return NextResponse.json({ message: 'Item not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(existing.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    await ProjectQuickAccess.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting quick access item:', error);
    return NextResponse.json({ message: 'Failed to delete quick access item' }, { status: 500 });
  }
}
