import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectOnboarding from '@/models/ProjectOnboarding';
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

const GUIDE_ALLOWLIST = ['projectOverview', 'development', 'git', 'deployment', 'team', 'documentation'];

// GET - Fetch onboarding guide for a project
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

    let onboarding = await ProjectOnboarding.findOne({ projectId });

    // If no onboarding exists, return a default structure
    if (!onboarding) {
      onboarding = {
        projectId,
        projectOverview: {
          businessPurpose: '',
          architectureOverview: '',
          techStack: []
        },
        development: {
          folderStructure: '',
          developmentWorkflow: '',
          localSetupGuide: '',
          installationSteps: [],
          requiredTools: [],
          codingStandards: ''
        },
        git: {
          branchStrategy: '',
          pullRequestProcess: ''
        },
        deployment: {
          deploymentProcess: '',
          testingProcess: '',
          releaseProcess: ''
        },
        team: {
          importantContacts: '',
          teamMembers: []
        },
        documentation: {
          faqs: [],
          knownIssues: [],
          troubleshootingGuide: ''
        }
      };
    }

    return NextResponse.json({ onboarding }, { status: 200 });
  } catch (error) {
    console.error('Error fetching onboarding:', error);
    return NextResponse.json({ message: 'Failed to fetch onboarding' }, { status: 500 });
  }
}

// POST - Create or update onboarding guide
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (rejectDollarKeys(body)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }
    const { projectId } = body;
    // Client-supplied userId/userName/userEmail are ignored — session identity only.

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };
    const data: any = {};
    for (const key of GUIDE_ALLOWLIST) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    let onboarding = await ProjectOnboarding.findOne({ projectId });

    if (onboarding) {
      // Update existing
      const newVersion = onboarding.version + 1;
      onboarding.versions.push({
        version: newVersion,
        changes: 'Updated onboarding guide',
        updatedBy: actor,
        updatedAt: new Date()
      });

      if (data.projectOverview) onboarding.projectOverview = data.projectOverview;
      if (data.development) onboarding.development = data.development;
      if (data.git) onboarding.git = data.git;
      if (data.deployment) onboarding.deployment = data.deployment;
      if (data.team) onboarding.team = data.team;
      if (data.documentation) onboarding.documentation = data.documentation;
      onboarding.lastUpdatedBy = actor;
      onboarding.version = newVersion;
      onboarding.updatedAt = new Date();

      await onboarding.save();
    } else {
      // Create new
      onboarding = await ProjectOnboarding.create({
        projectId,
        projectOverview: data.projectOverview || {},
        development: data.development || {},
        git: data.git || {},
        deployment: data.deployment || {},
        team: data.team || {},
        documentation: data.documentation || {},
        createdBy: actor,
        lastUpdatedBy: actor,
        version: 1,
        versions: [{
          version: 1,
          changes: 'Initial onboarding guide',
          updatedBy: actor,
          updatedAt: new Date()
        }]
      });
    }

    return NextResponse.json({ onboarding }, { status: 201 });
  } catch (error) {
    console.error('Error saving onboarding:', error);
    return NextResponse.json({ message: 'Failed to save onboarding' }, { status: 500 });
  }
}
