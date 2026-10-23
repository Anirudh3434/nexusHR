import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { isRouteAccessible, isRouteAccessibleWith, canViewIn, type Role, type Module, type Permission } from './lib/permissions'
import { featureForPath, hasFeature, coerceFeatures, FEATURE_LABELS } from './lib/entitlements'

export const SESSION_COOKIE = 'nexushr_session'

// Client-asserted identity headers. These are NEVER trusted from the
// client: they are stripped below unless this middleware verified a
// session and set them itself.
const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-user-name', 'x-user-email', 'x-company-id', 'x-user-perms', 'x-user-plan', 'x-user-features'] as const

interface VerifiedSession {
  id: string
  role: string
  companyId?: string
  email?: string
  name?: string
  isCandidate?: boolean
  mustChangePassword?: boolean
  /** Effective role permission map snapshotted at sign-in (see lib/auth.ts). */
  perms?: Record<string, string[]>
  /** Subscription plan id and unlocked features snapshotted at sign-in. */
  plan?: string
  features?: string[]
}

/** Validate the untrusted perms claim shape before honoring it. */
function sanitizePermsClaim(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, string[]> = {}
  for (const [module, perms] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(perms)) return undefined
    if (!perms.every((p) => typeof p === 'string')) return undefined
    out[module] = perms as string[]
  }
  return out
}

// Edge-safe (jose) session verification. Needs the same JWT_SECRET the
// API routes sign with. No secret or no cookie => no session, never an error.
async function getVerifiedSession(request: NextRequest): Promise<VerifiedSession | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    if (!payload || typeof payload.id !== 'string' || !payload.id) return null
    return {
      id: payload.id,
      role: typeof payload.role === 'string' ? payload.role : 'employee',
      companyId: typeof payload.companyId === 'string' ? payload.companyId : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      isCandidate: payload.isCandidate === true,
      mustChangePassword: payload.mustChangePassword === true,
      perms: sanitizePermsClaim((payload as Record<string, unknown>).perms),
      plan: typeof payload.plan === 'string' ? payload.plan : undefined,
      features: coerceFeatures((payload as Record<string, unknown>).features),
    }
  } catch {
    return null
  }
}

// Helper to extract company subdomain (e.g. webatlas.localhost:3000 -> webatlas)
function getSubdomain(host: string): string | null {
  if (!host) return null
  const hostname = host.split(':')[0].toLowerCase()

  // Localhost subdomain: e.g. webatlas.localhost
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0]
    }
    return null
  }

  // Vercel preview/production domains are not tenant subdomains.
  // e.g. nexus-hr-udh9.vercel.app must serve the root app, not a tenant.
  if (hostname.endsWith('.vercel.app')) {
    return null
  }

  // Production domain: e.g. webatlas.nexus.com or webatlas.nexushr.com
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    const reserved = ['www', 'api', 'app', 'admin', 'candidate', 'mail', 'staging', 'dev']
    if (!reserved.includes(sub)) {
      return sub
    }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const subdomain = getSubdomain(host)
  const pathname = request.nextUrl.pathname

  const companyCodeCookie = request.cookies.get('nexushr_company_code')?.value

  // 1. Subdomain Multi-Tenant Routing (e.g. webatlas.localhost:3000 or webatlas.nexus.com)
  if (subdomain && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/candidate')) {
    const isSwitching = request.nextUrl.searchParams.get('switch') === 'true'

    // If user clicked Switch Organization, redirect to root login
    if (isSwitching) {
      const port = host.includes(':') ? `:${host.split(':')[1]}` : ''
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1')
      const rootUrl = isLocal ? `http://localhost${port}/login?switch=true` : `${request.nextUrl.protocol}//${host.split('.').slice(-2).join('.')}${port}/login?switch=true`
      const res = NextResponse.redirect(new URL(rootUrl))
      res.cookies.delete('nexushr_company_code')
      return res
    }

    // If accessing root "/" or "/login" on a company subdomain, rewrite internally to "/[companySlug]"
    if (pathname === '/' || pathname === '/login') {
      return NextResponse.rewrite(new URL(`/${subdomain}`, request.url))
    }
  }

  const isApi = pathname.startsWith('/api')
  const isPublic = pathname.startsWith('/auth') || pathname.startsWith('/_next') || pathname.startsWith('/login') || pathname === '/candidate-login' || pathname.startsWith('/careers')

  // Verified session (signature-checked). This is the only identity
  // the server trusts; the old unsigned `user` cookie is ignored.
  const session = await getVerifiedSession(request)

  // API routes: forward ONLY verified identity. Forged client headers
  // are stripped so downstream getAuthInfo() can trust what it sees.
  if (isApi) {
    const requestHeaders = new Headers(request.headers)
    for (const h of IDENTITY_HEADERS) requestHeaders.delete(h)
    if (session) {
      // Plan gating: a verified session whose plan lacks the feature that
      // owns this API surface is rejected before the route runs. Absent
      // features claim (legacy token) stays fail-open until next sign-in.
      const feature = featureForPath(pathname)
      if (session.features && feature && !hasFeature(session.features, feature)) {
        return NextResponse.json(
          {
            error: `Your plan doesn't include ${FEATURE_LABELS[feature]}.`,
            code: 'plan_upgrade_required',
            feature,
          },
          { status: 402 }
        )
      }
      requestHeaders.set('x-user-id', session.id)
      requestHeaders.set('x-user-role', session.role || 'employee')
      requestHeaders.set('x-user-name', session.name || '')
      requestHeaders.set('x-user-email', session.email || '')
      requestHeaders.set('x-company-id', session.companyId || '')
      requestHeaders.set('x-user-plan', session.plan || '')
      // Forward the verified effective permission map so API routes can
      // enforce company overrides without a DB read (see lib/api-guard.ts).
      if (session.perms) {
        requestHeaders.set('x-user-perms', JSON.stringify(session.perms))
      }
      if (session.features) {
        requestHeaders.set('x-user-features', JSON.stringify(session.features))
      }
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  if (isPublic) {
    // Already signed in? Skip the company-code gateway bounce and go home.
    // (switch=true is honored so "Switch Organization" keeps working.)
    if (session && pathname.startsWith('/login') && request.nextUrl.searchParams.get('switch') !== 'true') {
      return NextResponse.redirect(new URL(session.isCandidate ? '/candidate/dashboard' : '/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Check if user is logged in for protected routes
  const needsSession =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/candidate') ||
    (pathname.startsWith('/super-admin') && pathname !== '/super-admin/login');
  if (!session && needsSession) {
    const loginPath = pathname.startsWith('/candidate')
      ? '/candidate-login'
      : pathname.startsWith('/super-admin')
        ? '/super-admin/login'
        : '/login'
    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  if (session) {
    const validRoles: Role[] = ["super_admin", "admin", "hr", "manager", "employee"]
    const role: Role = validRoles.includes(session.role as Role) ? (session.role as Role) : "employee"
    const isCandidate = !!session.isCandidate

    // Candidate portal users can ONLY access /candidate/* pages (and APIs above)
    if (isCandidate) {
      if (pathname.startsWith('/candidate')) {
        // Temporary portal accounts must set their own password before using the portal
        if (session.mustChangePassword && pathname !== '/candidate/change-password') {
          return NextResponse.redirect(new URL('/candidate/change-password', request.url))
        }
        return NextResponse.next()
      }
      // Candidate trying to reach the employee dashboard / other pages -> candidate portal
      return NextResponse.redirect(new URL('/candidate/dashboard', request.url))
    }

    // Non-candidate users cannot enter the candidate portal
    if (pathname.startsWith('/candidate')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Platform super-admin area — role gate (not in the module map on purpose).
    // The platform sign-in itself stays public; the page admits super_admins.
    // Evaluated before the workspace password-rotation redirect: platform
    // admins rotate via the platform dashboard banner, not /change-password.
    if (pathname.startsWith('/super-admin') && pathname !== '/super-admin/login') {
      if (role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // Temporary portal accounts must set their own password before using the app
    if (session.mustChangePassword && pathname !== '/change-password') {
      return NextResponse.redirect(new URL('/change-password', request.url))
    }

    // Check route access permissions (company overrides honored when
    // the session carries an effective permission map).
    const routeAllowed = session.perms
      ? isRouteAccessibleWith(role, pathname, (module: Module) =>
          canViewIn(session.perms as Record<Module, Permission[]>, module)
        )
      : isRouteAccessible(role, pathname)
    if (!routeAllowed) {
      // Redirect to dashboard if not authorized
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Plan gating: send users to billing when a page belongs to a feature
    // their plan doesn't include. Absent features claim (legacy token) is
    // fail-open until the next sign-in.
    const feature = featureForPath(pathname)
    if (session.features && feature && !hasFeature(session.features, feature)) {
      return NextResponse.redirect(new URL(`/billing?upgrade=${feature}`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
