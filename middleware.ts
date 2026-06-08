import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt-do-not-use-in-production'
const encodedSecret = new TextEncoder().encode(JWT_SECRET)

// Paths that don't require authentication or tenant resolution
const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/api/auth/login', '/api/auth/check-session', '/api/public', '/api/webhooks', '/invite', '/api/invites/token', '/api/invites/accept', '/api/parse-resume', '/careers', '/question-papers/take', '/api/execute-code', '/interview-booking', '/api/interview-booking']

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Allow public paths and static assets
  if (
    pathname === '/' ||
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Public candidate-application submit endpoint
  // Allows unauthenticated candidates to apply to a specific job.
  if (method === 'POST' && /^\/api\/jobs\/[^/]+\/applications$/.test(pathname)) {
    return NextResponse.next()
  }

  // Public candidate assessment endpoints (attempt lifecycle + proctoring)
  if (/^\/api\/question-papers\/[^/]+\/attempts(\/.*)?$/.test(pathname)) {
    return NextResponse.next()
  }

  // Internal async AI scoring trigger endpoint
  // Triggered right after public application submit.
  if (method === 'POST' && /^\/api\/jobs\/[^/]+\/applications\/[^/]+\/score$/.test(pathname)) {
    return NextResponse.next()
  }

  // Tenant-Scoped Routing Rewrite
  // If the path is /organization/[tenant-slug]/..., rewrite it internally to /...
  let rewriteUrl: URL | null = null;
  let tenantSlug: string | null = null;

  if (pathname.startsWith('/organization/')) {
    const slugMatch = pathname.match(/^\/organization\/([^\/]+)(\/.*)?$/)
    if (slugMatch) {
      tenantSlug = slugMatch[1]
      const restOfPath = slugMatch[2] || '/'
      rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = restOfPath
    }
  }

  // Subdomain routing (e.g., tenantSlug.localhost:3000)
  const hostname = request.headers.get('host') || ''
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')
  const hostParts = hostname.split('.')

  // Basic check: if it's more than localhost:3000 (e.g. acme.localhost:3000)
  // or more than domain.com (e.g. acme.domain.com)
  if ((isLocalhost && hostParts.length > 1 && !hostname.startsWith('localhost')) || (!isLocalhost && hostParts.length > 2)) {
    tenantSlug = hostParts[0]

    // Redirect public careers/jobs to internal dynamic routes
    if (pathname.startsWith('/jobs/') || pathname === '/jobs') {
      rewriteUrl = new URL(`/public/${tenantSlug}${pathname}`, request.url)
    } else if (pathname === '/') {
      rewriteUrl = new URL(`/public/${tenantSlug}/jobs`, request.url)
    }
  }

  // Check for the custom auth token (session cookie or Bearer token for API)
  const isApiRoute = pathname.startsWith('/api')
  const sessionCookie = request.cookies.get('session')?.value
  const authHeader = request.headers.get('Authorization')
  const token = sessionCookie || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null)

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    const originalPathWithQuery = pathname + request.nextUrl.search
    loginUrl.searchParams.set('redirect', originalPathWithQuery)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify the JWT token using jose for edge compatibility
    await jwtVerify(token, encodedSecret)
  } catch (error) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized or token expired' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('session')
    return response
  }

  // If we are rewriting, return the rewrite instead of next()
  const response = rewriteUrl ? NextResponse.rewrite(rewriteUrl) : NextResponse.next()

  // Set the tenant slug header so downstream components can read it
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/api/:path*'],
}
