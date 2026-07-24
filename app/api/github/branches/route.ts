import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get('accessToken');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!accessToken || !owner || !repo) {
      return NextResponse.json({ 
        message: 'Missing required parameters',
        required: ['accessToken', 'owner', 'repo']
      }, { status: 400 });
    }

    const branches = await githubService.getBranches(accessToken, owner, repo);

    // Parse ticket numbers from branch names
    const branchesWithTickets = branches.map(branch => ({
      ...branch,
      ticketNumber: githubService.parseTicketNumberFromBranch(branch.name),
    }));

    return NextResponse.json({ branches: branchesWithTickets });
  } catch (error: any) {
    console.error('Error fetching GitHub branches:', error);
    return NextResponse.json({ message: 'Error fetching branches', error: error.message }, { status: 500 });
  }
}
