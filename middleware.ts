import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isRouteAccessible } from './lib/permissions'

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

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const subdomain = getSubdomain(host)
  const pathname = request.nextUrl.pathname
  const userCookie = request.cookies.get('user')?.value

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

  // Public routes that don't need protection
  if (isPublic || isApi) {
    if (userCookie && isApi) {
      try {
        const user = JSON.parse(userCookie)
        // Add user info to headers for API routes
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', user.id || '')
        requestHeaders.set('x-user-role', user.role || 'employee')
        requestHeaders.set('x-user-name', user.name || '')
        requestHeaders.set('x-user-email', user.email || '')
        requestHeaders.set('x-company-id', user.companyId || '')

        return NextResponse.next({
          request: { headers: requestHeaders },
        })
      } catch (e) {
        return NextResponse.next()
      }
    }
    return NextResponse.next()
  }

  // Check if user is logged in for protected routes
  if (!userCookie && (pathname.startsWith('/dashboard') || pathname.startsWith('/employees') || pathname.startsWith('/candidate'))) {
    const loginPath = pathname.startsWith('/candidate') ? '/candidate-login' : '/login'
    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  if (userCookie) {
    try {
      const user = JSON.parse(userCookie)
      const role = user.role || 'employee'
      const isCandidate = !!user.isCandidate

      // Candidate portal users can ONLY access /candidate/* pages (and APIs above)
      if (isCandidate) {
        if (pathname.startsWith('/candidate')) {
          // Temporary portal accounts must set their own password before using the portal
          if (user.mustChangePassword && pathname !== '/candidate/change-password') {
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

      // Temporary portal accounts must set their own password before using the app
      if (user.mustChangePassword && pathname !== '/change-password') {
        return NextResponse.redirect(new URL('/change-password', request.url))
      }

      // Check route access permissions
      if (!isRouteAccessible(role, pathname)) {
        // Redirect to dashboard if not authorized
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

    } catch (e) {
      // Invalid cookie, redirect to login for protected routes
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/employees') || pathname.startsWith('/candidate')) {
        const loginPath = pathname.startsWith('/candidate') ? '/candidate-login' : '/login'
        return NextResponse.redirect(new URL(loginPath, request.url))
      }
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
