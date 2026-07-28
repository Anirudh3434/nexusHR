import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RetentionPrediction from '@/models/RetentionPrediction';
import { headers } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');

    if (!companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;

    // Get the most recent prediction for the employee
    const prediction = await RetentionPrediction.findOne({
      employeeId,
      companyId,
    }).sort({ assessmentDate: -1 });

    if (!prediction) {
      return NextResponse.json({ message: 'No prediction found for this employee' }, { status: 404 });
    }

    return NextResponse.json({ prediction }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching retention risk:', error);
    return NextResponse.json({ message: 'Error fetching retention risk', error: error.message }, { status: 500 });
  }
}
