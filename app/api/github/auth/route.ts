import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;
    const authUrl = githubService.getAuthUrl(projectId);
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error getting GitHub auth URL:', error);
    return NextResponse.json({ 
      message: error.message || 'GitHub OAuth is not configured.',
      error: error.message 
    }, { status: 400 });
  }
}
