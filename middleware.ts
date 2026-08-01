import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isRouteAccessible } from './lib/permissions'

export function middleware(request: NextRequest) {
  // Get user info from cookie
  const userCookie = request.cookies.get('user')?.value
  const pathname = request.nextUrl.pathname

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
  matcher: ['/api/:path*', '/dashboard/:path*', '/candidate/:path*', '/candidate-login', '/((?!auth|_next|static|login|.*\\..*$).*)'],
}
