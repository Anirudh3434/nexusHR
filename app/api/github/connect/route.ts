import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { headers } from 'next/headers';

function normalizeRepoFullName(input: string): string {
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^https?:\/\/github\.com\//i, '');
  cleaned = cleaned.replace(/^github\.com\//i, '');
  cleaned = cleaned.replace(/\.git$/i, '');
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');
  return cleaned;
}

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

    if (!projectId || !repoFullName) {
      return NextResponse.json({ 
        message: 'Project ID and repository name (owner/repo) are required.'
      }, { status: 400 });
    }

    const cleanRepo = normalizeRepoFullName(repoFullName);
    const parts = cleanRepo.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return NextResponse.json({
        message: 'Invalid repository format. Please use "owner/repository" or full GitHub URL.'
      }, { status: 400 });
    }

    const [owner, repo] = parts;

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Update project with GitHub repo info
    project.githubRepo = cleanRepo;
    if (accessToken) {
      project.githubToken = accessToken.trim();
    }
    await project.save();

    // Webhook configuration URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/webhooks/github`;
    let webhookCreated = false;
    let webhookError: string | null = null;

    // If an access token is provided, attempt automatic webhook installation via GitHub API
    if (accessToken) {
      try {
        await githubService.createWebhook(accessToken.trim(), owner, repo, webhookUrl);
        webhookCreated = true;
      } catch (err: any) {
        console.warn('Automatic GitHub webhook installation skipped:', err?.response?.data?.message || err.message);
        webhookError = err?.response?.data?.message || 'Could not auto-install webhook (requires admin:repo_hook scope or public domain). You can add it manually in GitHub repository settings.';
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'GitHub repository linked successfully',
      project,
      repoFullName: cleanRepo,
      webhookUrl,
      webhookCreated,
      webhookNotice: webhookError
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
    project.githubToken = undefined;
    project.githubDefaultBranch = undefined;
    await project.save();

    return NextResponse.json({ 
      success: true,
      message: 'GitHub repository disconnected successfully' 
    });
  } catch (error: any) {
    console.error('Error disconnecting GitHub repository:', error);
    return NextResponse.json({ message: 'Error disconnecting repository', error: error.message }, { status: 500 });
  }
}
