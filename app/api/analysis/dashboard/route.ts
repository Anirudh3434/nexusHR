import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Missing companyId' }, { status: 400 });
    }

    // Get the most recent analysis date
    const latest = await PerformanceAnalysis.findOne({ companyId }).sort({ date: -1 });
    if (!latest) {
      return NextResponse.json({ reports: [] });
    }

    // Get all reports for that date
    const reports = await PerformanceAnalysis.find({ 
      companyId, 
      date: latest.date 
    })
    .populate('employeeId', 'name designation department')
    .sort({ rating: -1 });

    return NextResponse.json({ 
      date: latest.date,
      reports 
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching analysis', error: error.message }, { status: 500 });
  }
}
