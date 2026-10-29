import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json({ message: 'Authorization code is required' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await githubService.exchangeCodeForToken(code);
    
    // Get user info
    const userInfo = await githubService.getUserInfo(tokenResponse.access_token);

    await connectDB();

    // Find user by GitHub username or email
    const user = await User.findOne({
      $or: [
        { email: userInfo.email },
        { github: userInfo.login }
      ]
    });

    if (user) {
      user.github = userInfo.login;
      await user.save();
    }

    // Determine target redirect destination
    const destination = state && state.length >= 10
      ? `/projects/${state}/settings?github_token=${tokenResponse.access_token}&github_user=${userInfo.login}`
      : `/projects?github_token=${tokenResponse.access_token}&github_user=${userInfo.login}`;

    return NextResponse.redirect(new URL(destination, req.url));
  } catch (error: any) {
    console.error('Error in GitHub callback:', error);
    return NextResponse.json({ message: 'Error in GitHub callback', error: error.message }, { status: 500 });
  }
}
