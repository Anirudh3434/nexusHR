import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Onboarding from '@/models/Onboarding';
import { headers } from 'next/headers';
import { deriveOnboardingStatus } from '@/lib/onboardingTemplates';

const STAFF_ROLES = ['super_admin', 'admin', 'hr'];

// GET - Fetch a single onboarding record
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const record = await Onboarding.findById(id).populate('employeeId', 'name email role isActive department designation');
    if (!record) {
      return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });
    }

    // Company scoping
    if (record.companyId.toString() !== companyId) {
      return NextResponse.json({ message: 'Forbidden: Access to another company\'s record is not allowed' }, { status: 403 });
    }

    // Employees can only view their own onboarding
    if (userRole === 'employee') {
      const isOwner = record.employeeId && (record.employeeId._id || record.employeeId).toString() === userId;
      if (!isOwner) {
        return NextResponse.json({ message: 'Forbidden: You can only view your own onboarding' }, { status: 403 });
      }
    }

    return NextResponse.json({ onboarding: record });
  } catch (error: any) {
    console.error('Error fetching onboarding:', error);
    return NextResponse.json({ message: 'Error fetching onboarding', error: error.message }, { status: 500 });
  }
}

// PATCH - Update candidate info / general fields / cancel
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || '';
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!STAFF_ROLES.includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const record = await Onboarding.findById(id);
    if (!record) {
      return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });
    }

    const body = await req.json();
    const { candidate, notes, cancel } = body;

    if (candidate) {
      const allowed = ['fullName', 'email', 'phone', 'position', 'department', 'reportingManager', 'employmentType', 'workLocation', 'source'];
      for (const key of allowed) {
        if (candidate[key] !== undefined) {
          record.candidate[key] = candidate[key];
        }
      }
      if (candidate.joiningDate !== undefined) {
        const d = new Date(candidate.joiningDate);
        if (!isNaN(d.getTime())) record.candidate.joiningDate = d;
      }
    }

    if (notes !== undefined) record.notes = notes;

    if (cancel) {
      record.status = 'cancelled';
      record.activity.push({ userId, userName, action: 'cancelled', details: 'Onboarding cancelled' });
    }

    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };
    record.activity.push({ userId, userName, action: 'updated', details: 'Onboarding details updated' });

    // Re-derive status/progress
    const derived = deriveOnboardingStatus(record);
    record.status = derived.status;
    record.progress = derived.progress;

    await record.save();

    return NextResponse.json({ message: 'Onboarding updated successfully', onboarding: record });
  } catch (error: any) {
    console.error('Error updating onboarding:', error);
    return NextResponse.json({ message: 'Error updating onboarding', error: error.message }, { status: 500 });
  }
}

// DELETE - Remove onboarding (draft only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!STAFF_ROLES.includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const record = await Onboarding.findById(id);
    if (!record) {
      return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });
    }

    if (record.status !== 'draft') {
      return NextResponse.json({ message: 'Only draft onboarding records can be deleted' }, { status: 400 });
    }

    await Onboarding.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Onboarding deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting onboarding:', error);
    return NextResponse.json({ message: 'Error deleting onboarding', error: error.message }, { status: 500 });
  }
}
