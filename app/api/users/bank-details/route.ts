import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BankDetail from '@/models/BankDetail';
import Employee from '@/models/Employee';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { 
  encryptObject, 
  maskAccountNumber, 
  generateBlindIndex, 
  maskGeneric,
  IEncryptedBankDetails 
} from '@/lib/security/encryption';

// Helper to mask UPI ID e.g. "user@okhdfcbank" -> "u***@okhdfcbank"
function maskUpiId(upi?: string): string {
  if (!upi) return '';
  const parts = upi.split('@');
  if (parts.length === 2 && parts[0].length > 1) {
    const handle = parts[0];
    const maskedHandle = handle[0] + '***' + (handle.length > 3 ? handle[handle.length - 1] : '');
    return `${maskedHandle}@${parts[1]}`;
  }
  return maskGeneric(upi, 3);
}

// GET - Retrieve employee/user bank details
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');

    let targetUserId = auth.userId;
    if (requestedUserId && requestedUserId !== auth.userId) {
      if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const targetUser = await User.findById(requestedUserId).select('companyId');
      if (!targetUser) return NextResponse.json({ message: 'User not found' }, { status: 404 });
      if (auth.role !== 'super_admin' && targetUser.companyId?.toString() !== auth.companyId) {
        return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
      }
      targetUserId = requestedUserId;
    }

    const companyId = auth.companyId;
    if (!companyId && auth.role !== 'super_admin') {
      return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    }

    const query: any = { userId: targetUserId };
    if (auth.role !== 'super_admin') {
      query.companyId = companyId;
    }

    const bankDetail = await BankDetail.findOne(query).lean();

    if (!bankDetail) {
      return NextResponse.json({ bankDetail: null });
    }

    // Return strictly masked, safe payload
    return NextResponse.json({
      bankDetail: {
        id: (bankDetail as any)._id.toString(),
        bankName: bankDetail.bankName,
        accountHolderName: bankDetail.accountHolderName,
        accountNumberMasked: bankDetail.accountNumberMasked,
        ifscCode: bankDetail.ifscCode,
        branchName: bankDetail.branchName || '',
        upiIdMasked: bankDetail.upiIdMasked || '',
        isVerified: bankDetail.isVerified || false,
        verifiedAt: bankDetail.verifiedAt || null,
        updatedAt: bankDetail.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching bank details:', error);
    return NextResponse.json({ message: 'Error fetching bank details', error: error.message }, { status: 500 });
  }
}

// POST / PUT - Save or update bank details with AES-256-GCM encryption
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { 
      userId: bodyUserId, 
      bankName, 
      accountHolderName, 
      accountNumber, 
      ifscCode, 
      branchName, 
      upiId 
    } = body;

    let targetUserId = auth.userId;
    if (bodyUserId && bodyUserId !== auth.userId) {
      if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const targetUser = await User.findById(bodyUserId).select('companyId');
      if (!targetUser) return NextResponse.json({ message: 'User not found' }, { status: 404 });
      if (auth.role !== 'super_admin' && targetUser.companyId?.toString() !== auth.companyId) {
        return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
      }
      targetUserId = bodyUserId;
    }

    // Validation
    if (!bankName || typeof bankName !== 'string' || bankName.trim().length === 0) {
      return NextResponse.json({ message: 'Bank name is required' }, { status: 400 });
    }
    if (!accountHolderName || typeof accountHolderName !== 'string' || accountHolderName.trim().length === 0) {
      return NextResponse.json({ message: 'Account holder name is required' }, { status: 400 });
    }
    if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim().length < 6) {
      return NextResponse.json({ message: 'Valid account number (minimum 6 digits) is required' }, { status: 400 });
    }
    if (!ifscCode || typeof ifscCode !== 'string' || ifscCode.trim().length < 4) {
      return NextResponse.json({ message: 'Valid IFSC code is required' }, { status: 400 });
    }

    const trimmedAccount = accountNumber.trim();
    const trimmedIfsc = ifscCode.trim().toUpperCase();
    const trimmedBankName = bankName.trim();
    const trimmedHolder = accountHolderName.trim();
    const trimmedBranch = branchName?.trim() || '';
    const trimmedUpi = upiId?.trim() || '';

    // Encrypt payload via AES-256-GCM
    const sensitivePayload: IEncryptedBankDetails = {
      accountNumber: trimmedAccount,
      ifscCode: trimmedIfsc,
      bankName: trimmedBankName,
      accountHolderName: trimmedHolder,
      branchName: trimmedBranch,
      upiId: trimmedUpi || undefined,
    };

    const encryptedDetails = encryptObject(sensitivePayload);
    const accountNumberMasked = maskAccountNumber(trimmedAccount);
    const blindIndexBank = generateBlindIndex(trimmedAccount);
    const upiIdMasked = trimmedUpi ? maskUpiId(trimmedUpi) : '';

    const companyId = auth.companyId;

    // Upsert BankDetail model
    const bankDoc = await BankDetail.findOneAndUpdate(
      { userId: targetUserId },
      {
        userId: targetUserId,
        companyId,
        encryptedDetails,
        bankName: trimmedBankName,
        accountHolderName: trimmedHolder,
        accountNumberMasked,
        ifscCode: trimmedIfsc,
        branchName: trimmedBranch,
        upiIdMasked,
        blindIndexBank,
        isVerified: false, // Reset verification when details are updated
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Sync to Employee document if linked
    try {
      await Employee.findOneAndUpdate(
        { userId: targetUserId },
        {
          encryptedBankDetails: encryptedDetails,
          bankAccountMasked: accountNumberMasked,
          blindIndexBank,
        }
      );
    } catch (empErr) {
      // Non-fatal if Employee record is not yet created
      console.warn('Note: Employee sync skipped during bank detail update:', empErr);
    }

    return NextResponse.json({
      message: 'Bank details securely saved with AES-256 encryption',
      bankDetail: {
        id: (bankDoc as any)._id.toString(),
        bankName: bankDoc.bankName,
        accountHolderName: bankDoc.accountHolderName,
        accountNumberMasked: bankDoc.accountNumberMasked,
        ifscCode: bankDoc.ifscCode,
        branchName: bankDoc.branchName || '',
        upiIdMasked: bankDoc.upiIdMasked || '',
        isVerified: bankDoc.isVerified,
        updatedAt: bankDoc.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error saving bank details:', error);
    return NextResponse.json({ message: 'Error saving bank details', error: error.message }, { status: 500 });
  }
}

