import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get('accessToken');
    const org = searchParams.get('org');

    if (!accessToken) {
      return NextResponse.json({ message: 'Access token is required' }, { status: 400 });
    }

    let repos;
    if (org) {
      repos = await githubService.getOrgRepos(accessToken, org);
    } else {
      repos = await githubService.getUserRepos(accessToken);
    }

    return NextResponse.json({ repos });
  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error);
    return NextResponse.json({ message: 'Error fetching repos', error: error.message }, { status: 500 });
  }
}
