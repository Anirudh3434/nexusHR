import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import SuperAdmin from '@/models/SuperAdmin';
import Company from '@/models/Company';
import Settings from '@/models/Settings';
import bcrypt from 'bcryptjs';
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, getSessionCookieDomain, type SessionPayload } from '@/lib/auth';
import { loginRateLimitHit, loginRateLimitClear } from '@/lib/rate-limit';

interface LoginCompanyBranding {
  name?: string;
  logo?: string | null;
}

interface LoginSettingsBranding {
  logo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  themeSource?: string | null;
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (typeof email !== 'string' || !email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Lightweight sliding-window rate limit: 10 attempts / 10 min per IP+email.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = `${ip}:${email.toLowerCase()}`;
    const rl = loginRateLimitHit(rateKey);
    if (!rl.allowed) {
      return NextResponse.json({ message: 'Too many login attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
    }

    // Find user and select password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Platform administrators live in a separate collection.
      const platform = await SuperAdmin.findOne({ email: email.toLowerCase() }).select('+password');
      if (!platform || !platform.isActive) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }
      const platformMatch = await bcrypt.compare(password, platform.password);
      if (!platformMatch) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }
      const platformSession: SessionPayload = {
        id: platform._id.toString(),
        role: 'super_admin',
        email: platform.email,
        name: platform.name,
        mustChangePassword: !!platform.mustChangePassword,
        tv: platform.tokenVersion ?? 0,
      };
      const platformToken = signSession(platformSession, '1d');
      loginRateLimitClear(rateKey);

      const platformRes = NextResponse.json({
        message: 'Login successful',
        user: {
          id: platform._id,
          name: platform.name,
          email: platform.email,
          role: 'super_admin',
          mustChangePassword: !!platform.mustChangePassword,
        },
        token: platformToken,
      }, { status: 200 });

      const platformCookieDomain = getSessionCookieDomain(req.headers.get('host'));
      platformRes.cookies.set(SESSION_COOKIE, platformToken, {
        ...SESSION_COOKIE_OPTIONS,
        ...(platformCookieDomain ? { domain: platformCookieDomain } : {}),
      });
      return platformRes;
    }

    if (!user.isActive) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Generate session JWT — companyId is embedded so tenant scope
    // comes from the signed token, never from client input.
    // Effective permissions (role defaults + role overrides + this user's
    // individual overrides) are snapshotted too so middleware can enforce
    // them without a DB read (edge-safe).
    const { getEffectiveUserMap } = await import('@/lib/permission-overrides');
    const { resolveSubscription } = await import('@/lib/subscription');
    const subscription = user.companyId ? await resolveSubscription(user.companyId.toString()) : null;
    const session: SessionPayload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      companyId: user.companyId?.toString(),
      name: user.name,
      isCandidate: !!user.isCandidate,
      mustChangePassword: !!user.mustChangePassword,
      tv: user.tokenVersion ?? 0,
      perms: user.companyId
        ? (await getEffectiveUserMap(user.companyId.toString(), user._id.toString(), user.role) as Record<string, string[]>)
        : undefined,
      plan: subscription?.plan ?? undefined,
      features: subscription?.features,
    };
    const token = signSession(session, '1d');
    loginRateLimitClear(rateKey);

    // Filter out password from response
    const company = (user.companyId
      ? await Company.findById(user.companyId).select('name logo').lean()
      : null) as LoginCompanyBranding | null;
    const settings = (user.companyId
      ? await Settings.findOne({ companyId: user.companyId })
          .select('logo primaryColor secondaryColor themeSource')
          .lean()
      : null) as LoginSettingsBranding | null;
    const resolvedLogo = settings?.logo || company?.logo || '';
    const resolvedName = company?.name || '';

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      status: user.status,
      avatar: user.avatar,
      companyId: user.companyId?.toString(),
      companyLogo: resolvedLogo,
      companyName: resolvedName,
      companyPrimaryColor: settings?.primaryColor || undefined,
      companySecondaryColor: settings?.secondaryColor || undefined,
      companyThemeSource: settings?.themeSource || undefined,
      workShiftId: user.workShiftId?.toString(),
      salary: user.salary,
      employeeId: user.employeeId,
      mustChangePassword: !!user.mustChangePassword,
      isCandidate: !!user.isCandidate,
    };

    const res = NextResponse.json({
      message: 'Login successful',
      user: userResponse,
      token,
    }, { status: 200 });

    // HttpOnly session cookie for the web app (JS cannot read it).
    // Domain-scoped where possible so one sign-in works across the root
    // domain and company subdomains. The token stays in the JSON body
    // for the mobile app (Bearer flow).
    const cookieDomain = getSessionCookieDomain(req.headers.get('host'));
    res.cookies.set(SESSION_COOKIE, token, {
      ...SESSION_COOKIE_OPTIONS,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    return res;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
