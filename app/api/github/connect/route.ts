import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/HR/manager can connect repos
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, repoFullName, accessToken } = body;

    if (!projectId || !repoFullName || !accessToken) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['projectId', 'repoFullName', 'accessToken']
      }, { status: 400 });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Parse owner and repo from full name
    const [owner, repo] = repoFullName.split('/');

    // Create webhook for the repository
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/github/webhook`;
    const webhook = await githubService.createWebhook(accessToken, owner, repo, webhookUrl);

    // Update project with GitHub repo info
    project.githubRepo = repoFullName;
    await project.save();

    return NextResponse.json({ 
      message: 'GitHub repository connected successfully',
      project,
      webhook
    });
  } catch (error: any) {
    console.error('Error connecting GitHub repository:', error);
    return NextResponse.json({ message: 'Error connecting repository', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/HR/manager can disconnect repos
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Remove GitHub repo connection
    project.githubRepo = undefined;
    await project.save();

    return NextResponse.json({ message: 'GitHub repository disconnected successfully' });
  } catch (error: any) {
    console.error('Error disconnecting GitHub repository:', error);
    return NextResponse.json({ message: 'Error disconnecting repository', error: error.message }, { status: 500 });
  }
}
