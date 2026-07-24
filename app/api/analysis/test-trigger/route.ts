import { NextResponse } from 'next/server';
import { runDailyAnalysis } from '@/lib/analysis/engine';

export async function POST(req: Request) {
  try {
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
