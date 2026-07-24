import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import { headers } from 'next/headers';

// GET - Fetch auto-comment rules for a project
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

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
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    let userName = headersList.get('x-user-name');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!userName || userName === 'Unknown User') {
      const u = await User.findById(userId).select('name');
      userName = u?.name || 'Team Member';
    }

    const body = await req.json();
    const { projectId, fromStatus, toStatus, template, ruleId } = body;

    if (!projectId || !fromStatus || !toStatus || !template) {
      return NextResponse.json({ message: 'projectId, fromStatus, toStatus, and template are required' }, { status: 400 });
    }

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
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const ruleId = searchParams.get('ruleId');

    if (!projectId || !ruleId) {
      return NextResponse.json({ message: 'projectId and ruleId are required' }, { status: 400 });
    }

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
