import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ===========================================
// SECURITY PROXY (formerly middleware)
// Implements: CSP, CSRF Protection, Route Guards
// ===========================================

const PROTECTED_ROUTES = [
    '/round2',
    '/api/team/update',
    '/api/Round-2',
];

const CSRF_PROTECTED_ROUTES = [
    '/api/team/update',
    '/api/Round-2/sync',
];

function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
}

function generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('hex');
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const response = NextResponse.next();

    // ============================================
    // 1. CONTENT SECURITY POLICY (CSP)
    // ============================================
    const nonce = generateNonce();

    const cspDirectives = [
        `default-src 'self'`,
        `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' https://fonts.gstatic.com`,
        `img-src 'self' data: https: blob:`,
        `connect-src 'self' https://codeforces.com https://www.hackerrank.com https://accounts.google.com ws: wss:`,
        `frame-ancestors 'none'`,
        `form-action 'self'`,
        `base-uri 'self'`,
        `object-src 'none'`,
    ];

    if (process.env.NODE_ENV === 'production') {
        cspDirectives.push(`upgrade-insecure-requests`);
    }

    response.headers.set(
        'Content-Security-Policy',
        cspDirectives.join('; ')
    );

    response.headers.set('x-nonce', nonce);

    // ============================================
    // 2. ADDITIONAL SECURITY HEADERS
    // ============================================
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');


    if (process.env.NODE_ENV === 'production') {
        response.headers.set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }

    // ============================================
    // 3. CSRF PROTECTION (Double Submit Cookie Pattern)
    // ============================================
    const isCSRFProtectedRoute = CSRF_PROTECTED_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    if (isCSRFProtectedRoute && request.method === 'POST') {
        const csrfCookie = request.cookies.get('csrf-token')?.value;
        const csrfHeader = request.headers.get('x-csrf-token');

        if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
            return NextResponse.json(
                { error: 'Invalid CSRF token' },
                { status: 403 }
            );
        }
    }

    if (!request.cookies.get('csrf-token')) {
        const csrfToken = generateCSRFToken();
        response.cookies.set('csrf-token', csrfToken, {
            httpOnly: false,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24,
        });
    }

    // ============================================
    // 4. ROUTE PROTECTION (Authentication)
    // ============================================
    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    if (isProtectedRoute) {
        if (pathname.startsWith('/api/auth')) {
            return response;
        }

        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'Unauthorized - Please login' },
                    { status: 401 }
                );
            }
            return NextResponse.redirect(new URL('/login', request.url));
        }

    }

    return response;
}

// Configure which routes the proxy runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
