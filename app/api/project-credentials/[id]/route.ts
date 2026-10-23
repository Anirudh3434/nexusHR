import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectCredential, { encrypt, decrypt } from '@/models/ProjectCredential';
import Project from '@/models/Project';
import { headers } from 'next/headers';
import { getAuthInfo } from '@/lib/auth-util';

async function getDisplayName(): Promise<string> {
  try { return (await headers()).get('x-user-name') || ''; } catch { return ''; }
}

interface AuthCtx { userId: string; role: string; companyId?: string; email?: string; name?: string }

async function requireProjectAccess(projectId: string, auth: AuthCtx) {
  const project = await Project.findById(projectId).select('companyId managerId members');
  if (!project) return { error: 'Project not found', status: 404 as const };
  if (!auth.companyId || project.companyId.toString() !== auth.companyId) {
    return { error: "Forbidden: Access to another company's project is not allowed", status: 403 as const };
  }
  const userRole = auth.role || 'employee';
  if (userRole === 'employee') {
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === auth.userId
    );
    if (!isMember) return { error: 'Forbidden: You are not a member of this project', status: 403 as const };
  } else if (userRole === 'manager') {
    const isManager = project.managerId && project.managerId.toString() === auth.userId;
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === auth.userId
    );
    if (!isManager && !isMember) {
      return { error: 'Forbidden: You do not manage or belong to this project', status: 403 as const };
    }
  }
  return { project };
}

function rejectDollarKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Object.keys(obj).some((k) => k.startsWith('$'));
}

function toSafeCredential(cred: any) {
  const o = typeof cred.toObject === 'function' ? cred.toObject() : { ...cred };
  const hasPassword = !!o.encryptedPassword;
  const hasOtp = !!o.encryptedOtpSecret;
  const hasApiKey = !!o.encryptedApiKey;
  const hasSecretKey = !!o.encryptedSecretKey;
  const hasAccessToken = !!o.encryptedAccessToken;
  const hasNotes = !!o.encryptedNotes;
  delete o.encryptedPassword;
  delete o.encryptedOtpSecret;
  delete o.encryptedApiKey;
  delete o.encryptedSecretKey;
  delete o.encryptedAccessToken;
  delete o.encryptedNotes;
  o.password = hasPassword ? '••••••••' : undefined;
  o.otpSecret = hasOtp ? '••••••••' : undefined;
  o.apiKey = hasApiKey ? '••••••••' : undefined;
  o.secretKey = hasSecretKey ? '••••••••' : undefined;
  o.accessToken = hasAccessToken ? '••••••••' : undefined;
  o.notes = hasNotes ? '••••••••' : undefined;
  o.versions = Array.isArray(o.versions)
    ? o.versions.map((v: any) => ({
        version: v.version,
        updatedBy: v.updatedBy,
        updatedAt: v.updatedAt,
        changeNotes: v.changeNotes,
      }))
    : [];
  return o;
}

const UPDATE_ALLOWLIST = [
  'service', 'environment', 'category', 'loginUrl', 'username', 'email',
  'password', 'otpSecret', 'recoveryEmail', 'recoveryPhone', 'apiKey',
  'secretKey', 'accessToken', 'notes', 'tags', 'isFavorite', 'expiryDate', 'changeNotes',
];

// PATCH - Update credential
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (rejectDollarKeys(body)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }

    const data: any = {};
    for (const key of UPDATE_ALLOWLIST) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const credential = await ProjectCredential.findById(id);
    if (!credential) {
      return NextResponse.json({ message: 'Credential not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(credential.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

    // Track version if sensitive data changed
    const sensitiveFields = ['password', 'apiKey', 'secretKey', 'accessToken', 'notes'];
    const hasSensitiveChanges = sensitiveFields.some(field => data[field] !== undefined);

    if (hasSensitiveChanges) {
      const newVersion = credential.versions.length + 1;
      credential.versions.push({
        version: newVersion,
        encryptedData: {
          username: data.username,
          password: data.password ? encrypt(data.password) : undefined,
          apiKey: data.apiKey ? encrypt(data.apiKey) : undefined,
          secretKey: data.secretKey ? encrypt(data.secretKey) : undefined,
          accessToken: data.accessToken ? encrypt(data.accessToken) : undefined,
          notes: data.notes ? encrypt(data.notes) : undefined
        },
        updatedBy: actor,
        updatedAt: new Date(),
        changeNotes: data.changeNotes
      });
    }

    // Update fields (explicit allowlist — no body spread, identity from session)
    if (data.service !== undefined) credential.service = data.service;
    if (data.environment !== undefined) credential.environment = data.environment;
    if (data.category !== undefined) credential.category = data.category;
    if (data.loginUrl !== undefined) credential.loginUrl = data.loginUrl;
    if (data.username !== undefined) credential.username = data.username;
    if (data.email !== undefined) credential.email = data.email;
    if (data.password !== undefined) credential.encryptedPassword = encrypt(data.password);
    if (data.otpSecret !== undefined) credential.encryptedOtpSecret = encrypt(data.otpSecret);
    if (data.recoveryEmail !== undefined) credential.recoveryEmail = data.recoveryEmail;
    if (data.recoveryPhone !== undefined) credential.recoveryPhone = data.recoveryPhone;
    if (data.apiKey !== undefined) credential.encryptedApiKey = encrypt(data.apiKey);
    if (data.secretKey !== undefined) credential.encryptedSecretKey = encrypt(data.secretKey);
    if (data.accessToken !== undefined) credential.encryptedAccessToken = encrypt(data.accessToken);
    if (data.notes !== undefined) credential.encryptedNotes = encrypt(data.notes);
    if (data.tags !== undefined) credential.tags = data.tags;
    if (data.isFavorite !== undefined) credential.isFavorite = data.isFavorite;
    if (data.expiryDate !== undefined) credential.expiryDate = new Date(data.expiryDate);
    credential.lastUpdatedBy = actor;

    credential.updatedAt = new Date();
    await credential.save();

    return NextResponse.json({ credential: toSafeCredential(credential) }, { status: 200 });
  } catch (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json({ message: 'Failed to update credential' }, { status: 500 });
  }
}

// DELETE - Delete credential
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await ProjectCredential.findById(id);
    if (!existing) {
      return NextResponse.json({ message: 'Credential not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(existing.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    await ProjectCredential.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Credential deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json({ message: 'Failed to delete credential' }, { status: 500 });
  }
}
