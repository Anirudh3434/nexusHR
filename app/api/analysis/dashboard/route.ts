import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';
import { getAuthInfo } from '@/lib/auth-util';

export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    if (queryCompanyId && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = auth.companyId;

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
