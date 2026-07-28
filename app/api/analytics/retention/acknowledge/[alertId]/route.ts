import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RetentionAlert from '@/models/RetentionAlert';
import { headers } from 'next/headers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');

    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = await params;
    const body = await req.json();
    const { actionTaken } = body;

    const alert = await RetentionAlert.findOneAndUpdate(
      { _id: alertId, companyId },
      {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        actionTaken: actionTaken || null,
      },
      { new: true }
    );

    if (!alert) {
      return NextResponse.json({ message: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ alert }, { status: 200 });

  } catch (error: any) {
    console.error('Error acknowledging retention alert:', error);
    return NextResponse.json({ message: 'Error acknowledging alert', error: error.message }, { status: 500 });
  }
}
