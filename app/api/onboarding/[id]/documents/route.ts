import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Onboarding from '@/models/Onboarding';
import { headers } from 'next/headers';
import { deriveOnboardingStatus } from '@/lib/onboardingTemplates';

const STAFF_ROLES = ['super_admin', 'admin', 'hr'];

// POST - Add a required document
export async function POST(
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

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(userRole)) return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });

    const body = await req.json();
    const { title, category, isRequired } = body;

    if (!title) return NextResponse.json({ message: 'Document title is required' }, { status: 400 });

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    record.documents.push({
      title,
      category: category || 'other',
      isRequired: isRequired !== false,
      status: 'pending',
    });

    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };
    record.activity.push({ userId, userName, action: 'document_added', details: `Added document requirement: ${title}` });

    await record.save();
    return NextResponse.json({ message: 'Document requirement added', onboarding: record }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding document:', error);
    return NextResponse.json({ message: 'Error adding document', error: error.message }, { status: 500 });
  }
}

// PATCH - Upload a document (employee or staff) OR verify/reject (staff)
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

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { documentId, fileUrl, fileName, action, remarks } = body;

    if (!documentId) return NextResponse.json({ message: 'documentId is required' }, { status: 400 });

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    // Employees can only upload to their own onboarding
    if (userRole === 'employee') {
      const isOwner = record.employeeId && record.employeeId.toString() === userId;
      if (!isOwner) return NextResponse.json({ message: 'You can only manage your own documents' }, { status: 403 });
    }

    const doc = record.documents.find((d: any) => d._id.toString() === documentId);
    if (!doc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

    if (action === 'upload') {
      if (!fileUrl) return NextResponse.json({ message: 'fileUrl is required' }, { status: 400 });
      doc.fileUrl = fileUrl;
      doc.fileName = fileName || '';
      doc.status = 'submitted';
      doc.submittedBy = { _id: userId, name: userName };
      doc.submittedAt = new Date();
      doc.remarks = '';
      record.activity.push({ userId, userName, action: 'document_uploaded', details: `Uploaded document: ${doc.title}` });
    } else if (action === 'verify' || action === 'reject') {
      if (!STAFF_ROLES.includes(userRole)) return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      doc.status = action === 'verify' ? 'verified' : 'rejected';
      if (action === 'verify') {
        doc.verifiedBy = { _id: userId, name: userName };
        doc.verifiedAt = new Date();
      }
      doc.remarks = remarks || '';
      record.activity.push({ userId, userName, action: action === 'verify' ? 'document_verified' : 'document_rejected', details: `${action === 'verify' ? 'Verified' : 'Rejected'} document: ${doc.title}` });
    } else {
      return NextResponse.json({ message: 'Invalid action. Use upload, verify or reject.' }, { status: 400 });
    }

    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };

    // Status only derives when offer is accepted; keep docs-driven states minimal
    const derived = deriveOnboardingStatus(record);
    if (record.status !== 'draft' && record.status !== 'offer_sent' && record.status !== 'offer_declined') {
      record.status = derived.status;
    }
    record.progress = derived.progress;

    await record.save();

    return NextResponse.json({ message: 'Document updated', onboarding: record });
  } catch (error: any) {
    console.error('Error updating document:', error);
    return NextResponse.json({ message: 'Error updating document', error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a document requirement
export async function DELETE(
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

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(userRole)) return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) return NextResponse.json({ message: 'documentId is required' }, { status: 400 });

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    const doc = record.documents.find((d: any) => d._id.toString() === documentId);
    if (!doc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    if (doc.status !== 'pending') {
      return NextResponse.json({ message: 'Only pending document requirements can be removed' }, { status: 400 });
    }

    record.documents = record.documents.filter((d: any) => d._id.toString() !== documentId);
    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };
    record.activity.push({ userId, userName, action: 'document_removed', details: `Removed document requirement: ${doc.title}` });

    await record.save();
    return NextResponse.json({ message: 'Document requirement removed', onboarding: record });
  } catch (error: any) {
    console.error('Error removing document:', error);
    return NextResponse.json({ message: 'Error removing document', error: error.message }, { status: 500 });
  }
}
