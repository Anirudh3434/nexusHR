import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';

export async function GET(req: Request) {
  try {
    const authUrl = githubService.getAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error getting GitHub auth URL:', error);
    return NextResponse.json({ message: 'Error getting GitHub auth URL', error: error.message }, { status: 500 });
  }
}
