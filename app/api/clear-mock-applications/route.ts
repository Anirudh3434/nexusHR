import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || '69da7042692690f1815cb0c1';
    
    // Delete only mock/demo applications
    const result = await JobApplication.deleteMany({ 
      companyId,
      $or: [
        { source: { $in: ['demo', 'manual'] } },
        { fromEmail: 'demo@example.com' },
        { fromEmail: 'candidate@example.com' },
        { fromName: 'John Doe' }
      ]
    });
    
    return NextResponse.json({ 
      message: 'Mock applications cleared',
      deleted: result.deletedCount 
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error', error: error.message }, { status: 500 });
  }
}
