import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // LOCALHOST BYPASS: Skip all auth checks for localhost in development
    const isLocalhost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    if (isLocalhost && process.env.NODE_ENV === 'development') {
      const response = NextResponse.next();
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
      return response;
    }

    // Simple security headers (Edge Runtime compatible)
    let response = NextResponse.next();

    // Protect admin routes
    if (pathname.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        response = NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // Protect validator routes
    if (pathname.startsWith('/validator')) {
      if (!token || (token.role !== 'VALIDATOR' && token.role !== 'ADMIN')) {
        response = NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // Block validators from accessing other routes (modules, employee, etc.)
    if (token && token.role === 'VALIDATOR') {
      const allowedPaths = ['/validator', '/verify', '/api/auth', '/api/accreditation/verify'];
      const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));

      if (!isAllowedPath && pathname !== '/') {
        response = NextResponse.redirect(new URL('/validator', req.url));
      }
    }

    // Add basic security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // LOCALHOST BYPASS: Skip authentication for localhost (development only)
        const isLocalhost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
        if (isLocalhost && process.env.NODE_ENV === 'development') {
          return true;
        }

        // Allow static files (images, fonts, etc.)
        if (
          pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/) ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/api/')
        ) {
          return true;
        }

        // Allow PWA files (must be public for installation)
        if (pathname === '/manifest.json' || pathname === '/service-worker.js') {
          return true;
        }

        // Allow public routes
        if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth') || pathname.startsWith('/api/health')) {
          return true;
        }

        // Allow verification routes (for QR code scanning)
        if (pathname.startsWith('/verify/')) {
          return true;
        }

        // Allow supplier registration (public)
        if (pathname.startsWith('/suppliers/register')) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.gif|.*\\.webp).*)',
  ],
};