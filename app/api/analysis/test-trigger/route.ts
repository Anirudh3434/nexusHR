import { NextResponse } from 'next/server';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const { date } = await req.json();
    const targetDate = date ? new Date(date) : new Date();

    console.log('[Test Trigger] Manually triggering analysis for:', targetDate.toISOString());

    const results = await runDailyAnalysis(targetDate);

    return NextResponse.json({
      message: `Analysis completed for ${results.length} employees`,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Analysis failed', error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Simple check for latest data
  return NextResponse.json({ message: 'Use POST to trigger analysis for a specific date.' });
}
