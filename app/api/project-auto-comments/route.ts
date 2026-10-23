import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import { headers } from 'next/headers';
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

// GET - Fetch auto-comment rules for a project
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const project = await Project.findById(projectId).select('autoCommentRules');
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    console.log('GET project autoCommentRules:', project.autoCommentRules);
    return NextResponse.json({ rules: project.autoCommentRules || [] });
  } catch (error: any) {
    console.error('Error fetching auto comment rules:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST - Create or update an auto-comment rule
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const headersList = await headers();
    let userName = headersList.get('x-user-name');

    if (!userName || userName === 'Unknown User') {
      const u = await User.findById(auth.userId).select('name');
      userName = u?.name || 'Team Member';
    }

    const body = await req.json();
    const { projectId, fromStatus, toStatus, template, ruleId } = body;

    if (!projectId || !fromStatus || !toStatus || !template) {
      return NextResponse.json({ message: 'projectId, fromStatus, toStatus, and template are required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    let rules = project.autoCommentRules || [];

    if (ruleId) {
      // Update existing rule
      rules = rules.map((r: any) => {
        if (r.id === ruleId) {
          return { ...r, fromStatus, toStatus, template };
        }
        return r;
      });
    } else {
      // Add new rule
      const newRule = {
        id: 'rule_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        fromStatus,
        toStatus,
        template,
        enabled: true,
        createdBy: userName,
        createdAt: new Date(),
      };
      rules.push(newRule as any);
    }

    project.autoCommentRules = rules;
    project.markModified('autoCommentRules');
    await project.save();

    console.log('Saved project autoCommentRules:', project.autoCommentRules);

    // Verify save by fetching fresh
    const freshProject = await Project.findById(projectId).select('autoCommentRules');
    console.log('Fresh project autoCommentRules:', freshProject?.autoCommentRules);

    return NextResponse.json({ message: 'Rule saved successfully', rules: project.autoCommentRules });
  } catch (error: any) {
    console.error('Error saving auto comment rule:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// DELETE - Remove an auto-comment rule
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const ruleId = searchParams.get('ruleId');

    if (!projectId || !ruleId) {
      return NextResponse.json({ message: 'projectId and ruleId are required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    project.autoCommentRules = (project.autoCommentRules || []).filter((r: any) => r.id !== ruleId);
    await project.save();

    return NextResponse.json({ message: 'Rule deleted successfully', rules: project.autoCommentRules });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
