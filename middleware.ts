import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isRouteAccessible } from './lib/permissions'

export function middleware(request: NextRequest) {
  // Get user info from cookie
  const userCookie = request.cookies.get('user')?.value
  const pathname = request.nextUrl.pathname
  
  // Public routes that don't need protection
  if (pathname.startsWith('/auth') || pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/login')) {
    if (userCookie && pathname.startsWith('/api')) {
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
  if (!userCookie && (pathname.startsWith('/dashboard') || pathname.startsWith('/employees'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie)
      const role = user.role || 'employee'

      // Temporary portal accounts must set their own password before using the app
      if (user.mustChangePassword && pathname !== '/change-password' && !pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/change-password', request.url))
      }

      // Check route access permissions
      if (!isRouteAccessible(role, pathname)) {
        // Redirect to dashboard if not authorized
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
    } catch (e) {
      // Invalid cookie, redirect to login for protected routes
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/employees')) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/((?!auth|_next|static|login|.*\\..*$).*)'],
}
