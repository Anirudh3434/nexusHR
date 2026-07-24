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

    if (!user) {
      return NextResponse.json({ message: 'User not found in system' }, { status: 404 });
    }

    // Update user's GitHub info
    user.github = userInfo.login;
    await user.save();

    // Return access token and user info (in production, store this securely)
    return NextResponse.redirect(new URL(`/dashboard/projects?github_token=${tokenResponse.access_token}&github_user=${userInfo.login}`, req.url));
  } catch (error: any) {
    console.error('Error in GitHub callback:', error);
    return NextResponse.json({ message: 'Error in GitHub callback', error: error.message }, { status: 500 });
  }
}
