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

// Project-membership check (same pattern as projects/[id] GET):
// company scope first, then employee must be a member, manager must manage or belong.
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

// Strip ALL ciphertext — return masks + version metadata only.
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
  // Version history: metadata only, never encryptedData ciphertext.
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

// GET - Fetch all credentials for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const environment = searchParams.get('environment');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const isFavorite = searchParams.get('isFavorite');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const query: any = { projectId };

    if (environment) query.environment = environment;
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isFavorite === 'true') query.isFavorite = true;

    const credentials = await ProjectCredential.find(query)
      .sort({ isFavorite: -1, updatedAt: -1 });

    // Masks only — never ciphertext.
    const safeCredentials = credentials.map(toSafeCredential);

    return NextResponse.json({ credentials: safeCredentials }, { status: 200 });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({ message: 'Failed to fetch credentials' }, { status: 500 });
  }
}

const CREATE_ALLOWLIST = [
  'projectId', 'service', 'environment', 'category', 'loginUrl', 'username',
  'email', 'password', 'otpSecret', 'recoveryEmail', 'recoveryPhone',
  'apiKey', 'secretKey', 'accessToken', 'notes', 'tags', 'isFavorite', 'expiryDate',
];

// POST - Create a new credential
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (rejectDollarKeys(body)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }

    const data: any = {};
    for (const key of CREATE_ALLOWLIST) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    const {
      projectId, service, environment, category, loginUrl, username, email,
      password, otpSecret, recoveryEmail, recoveryPhone, apiKey, secretKey,
      accessToken, notes, tags, isFavorite, expiryDate,
    } = data;

    if (!projectId || !service || !environment) {
      return NextResponse.json({ message: 'Project ID, service, and environment are required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    // Identity always from the session, never the request body.
    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

    const credential = await ProjectCredential.create({
      projectId,
      service,
      environment,
      category: category || 'Other',
      loginUrl,
      username,
      email,
      encryptedPassword: password ? encrypt(password) : undefined,
      encryptedOtpSecret: otpSecret ? encrypt(otpSecret) : undefined,
      recoveryEmail,
      recoveryPhone,
      encryptedApiKey: apiKey ? encrypt(apiKey) : undefined,
      encryptedSecretKey: secretKey ? encrypt(secretKey) : undefined,
      encryptedAccessToken: accessToken ? encrypt(accessToken) : undefined,
      encryptedNotes: notes ? encrypt(notes) : undefined,
      tags: tags || [],
      isFavorite: isFavorite || false,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      versions: [{
        version: 1,
        encryptedData: {
          username,
          password: password ? encrypt(password) : undefined,
          apiKey: apiKey ? encrypt(apiKey) : undefined,
          secretKey: secretKey ? encrypt(secretKey) : undefined,
          accessToken: accessToken ? encrypt(accessToken) : undefined,
          notes: notes ? encrypt(notes) : undefined
        },
        updatedBy: actor,
        updatedAt: new Date()
      }],
      createdBy: actor,
      lastUpdatedBy: actor
    });

    return NextResponse.json({ credential: toSafeCredential(credential) }, { status: 201 });
  } catch (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json({ message: 'Failed to create credential' }, { status: 500 });
  }
}
