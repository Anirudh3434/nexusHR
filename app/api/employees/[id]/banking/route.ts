import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import User from '@/models/User';
import {
  encryptObject,
  decryptObject,
  maskAccountNumber,
  maskPanNumber,
  maskAadhaar,
  generateBlindIndex,
  IEncryptedBankDetails,
  IEncryptedGovernmentId
} from '@/lib/security/encryption';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

// GET - Retrieve decrypted bank details & crucial ID (Admin, HR, or Owner only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const currentUserId = auth.userId;
    const userRole = auth.role || 'employee';

    // Find employee by userId or employee record _id
    const employee = await Employee.findOne({
      $or: [{ userId: id }, { _id: id }]
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee profile not found' }, { status: 404 });
    }

    // Role-Based Access Control
    const isOwner = currentUserId && (employee.userId?.toString() === currentUserId);
    const isPrivileged = hasRole(userRole, ['super_admin', 'admin', 'hr']);

    if (!isPrivileged && !isOwner) {
      // Non-privileged users only get masked data
      return NextResponse.json({
        bankAccountMasked: employee.bankAccountMasked || '••••••••',
        panMasked: employee.panMasked || '••••••••',
      }, { status: 200 });
    }
    // Same-company check for non-super_admin (owner is inherently same user; privileged must match)
    if (userRole !== 'super_admin' && !isOwner && employee.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    // Decrypt crucial data
    const bankDetails = decryptObject<IEncryptedBankDetails>(employee.encryptedBankDetails);
    const governmentId = decryptObject<IEncryptedGovernmentId>(employee.encryptedGovernmentId);

    return NextResponse.json({
      success: true,
      bankAccountMasked: employee.bankAccountMasked || (bankDetails ? maskAccountNumber(bankDetails.accountNumber) : null),
      panMasked: employee.panMasked || (governmentId?.panNumber ? maskPanNumber(governmentId.panNumber) : null),
      bankDetails: bankDetails || null,
      governmentId: governmentId ? {
        ...governmentId,
        aadhaarMasked: maskAadhaar(governmentId.aadhaarNumber),
      } : null,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching encrypted banking data:', error);
    return NextResponse.json({ message: 'Failed to fetch banking data', error: error.message }, { status: 500 });
  }
}

// POST/PUT - Save & Encrypt Bank Details & Crucial Identification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { bankDetails, governmentId } = body;

    const employee = await Employee.findOne({
      $or: [{ userId: id }, { _id: id }]
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee profile not found' }, { status: 404 });
    }

    const isOwner = employee.userId?.toString() === auth.userId;
    const isPrivileged = hasRole(auth.role, ['super_admin', 'admin', 'hr']);
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (auth.role !== 'super_admin' && employee.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updates: any = {};

    if (bankDetails) {
      updates.encryptedBankDetails = encryptObject(bankDetails);
      if (bankDetails.accountNumber) {
        updates.bankAccountMasked = maskAccountNumber(bankDetails.accountNumber);
        updates.blindIndexBank = generateBlindIndex(bankDetails.accountNumber);
      }
    }

    if (governmentId) {
      updates.encryptedGovernmentId = encryptObject(governmentId);
      if (governmentId.panNumber) {
        updates.panMasked = maskPanNumber(governmentId.panNumber);
        updates.blindIndexPan = generateBlindIndex(governmentId.panNumber);
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employee._id,
      { $set: updates },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Payment and crucial employee data encrypted successfully with AES-256-GCM',
      bankAccountMasked: updatedEmployee.bankAccountMasked,
      panMasked: updatedEmployee.panMasked,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error encrypting banking data:', error);
    return NextResponse.json({ message: 'Failed to encrypt banking data', error: error.message }, { status: 500 });
  }
}
