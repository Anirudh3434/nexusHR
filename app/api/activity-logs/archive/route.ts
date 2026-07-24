import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import { headers } from 'next/headers';

// POST - Archive old activity logs (older than 90 days)
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin can trigger archiving
    if (userRole !== 'admin') {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await req.json();
    const { daysThreshold = 90 } = body;
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    
    // Archive old logs
    const result = await ActivityLog.updateMany(
      {
        companyId,
        createdAt: { $lt: cutoffDate },
        isArchived: false
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date()
        }
      }
    );
    
    return NextResponse.json({ 
      message: 'Activity logs archived successfully',
      archivedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error archiving activity logs:', error);
    return NextResponse.json({ message: 'Failed to archive activity logs' }, { status: 500 });
  }
}
