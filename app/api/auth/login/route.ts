import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { signAccessToken, signMfaToken, signRefreshToken, signToken } from '@/lib/server/jwt'
import { cookies } from 'next/headers'
import { roles } from '@/data/roles'
import { admin } from '@/lib/server/firebase-admin'

const schema = z.object({
  idToken: z.string(),
})

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(req: Request) {
  let payload;
  try {
    payload = schema.parse(await req.json())
  } catch (parseError: any) {
    return NextResponse.json({ error: 'Invalid request payload (Zod or JSON error)', details: parseError.message }, { status: 400 })
  }

  // Verify Firebase token to get the email
  let decodedToken: any;
  try {
    decodedToken = await admin.auth().verifyIdToken(payload.idToken)
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error)
    return NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401 })
  }

  const email = decodedToken.email || ''

  const user = await prisma.user.findUnique({
    where: { firebaseUid: decodedToken.uid },
    include: {
      role: true,
      organizationMemberships: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            }
          }
        }
      }
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User account not found in database. Please contact administration.' }, { status: 401 })
  }
  const now = new Date()

  // Invite-accepted users should be able to log in directly after setting password.
  const acceptedInviteCount = await prisma.invite.count({
    where: {
      email: user.email,
      status: 'accepted',
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
    },
  })
  const isInviteOnboardedUser = acceptedInviteCount > 0

  // Enforce email verification before allowing login.
  // Fallback to live Firebase user record because ID token claims can be stale.
  if (!decodedToken.email_verified && !isInviteOnboardedUser) {
    try {
      const liveUser = await admin.auth().getUser(decodedToken.uid)
      if (!liveUser.emailVerified) {
        return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 403 })
    }
  }

  // DB-persisted lockout check
  if ((user as any).accountLockedUntil && new Date((user as any).accountLockedUntil) > now) {
    const minutesLeft = Math.ceil((new Date((user as any).accountLockedUntil).getTime() - now.getTime()) / 60000)
    return NextResponse.json(
      { error: `Account temporarily locked due to too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.` },
      { status: 429 }
    )
  }

  if (user.status !== 'active') {
    return NextResponse.json({ error: 'Your account is not active. Please contact administration.' }, { status: 403 })
  }

  // Check if this session was revoked
  if (user.tokenRevokedAt) {
    const jwtIssuedAt = decodedToken.iat ? decodedToken.iat * 1000 : 0
    // Allow a 5-second grace period to handle timestamp truncation and token caching
    if (jwtIssuedAt < user.tokenRevokedAt.getTime() - 5000) {
      return NextResponse.json({ error: 'Session revoked. Please log in again.' }, { status: 401 })
    }
  }

  // Successful login — reset persisted failed-attempt lock state
  if ((user as any).failedLoginAttempts || (user as any).failedLoginWindowStart || (user as any).accountLockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        failedLoginWindowStart: null,
        accountLockedUntil: null,
      } as any,
    })
  }

  // Find the active membership to resolve the role slug if roleId is null
  const activeMembership = user.organizationMemberships.find(m => m.organizationId === user.organizationId);
  const memoryRole = activeMembership ? roles.find(r => r.slug === activeMembership.role) : null;

  const finalRoleId = user.roleId || memoryRole?.id || null;
  const finalRoleSlug = user.role?.slug || memoryRole?.slug;

  if ((user as any).mfaEnabled || (user as any).mfaRequired) {
    const mfaToken = await signMfaToken({
      id: user.id,
      email: user.email,
      roleId: finalRoleId,
      roleSlug: finalRoleSlug,
    })
    return NextResponse.json(
      {
        message: 'MFA verification required',
        mfaRequired: true,
        mfaToken,
      },
      { status: 202 }
    )
  }

  const token = await signToken({
    id: user.id,
    email: user.email,
    roleId: finalRoleId,
    roleSlug: finalRoleSlug,
  })

  // Determine if the connection is actually secure (https) or if it's running locally/over LAN
  const isSecure = process.env.NODE_ENV === 'production' && req.headers.get('x-forwarded-proto') === 'https';

  // Set the httpOnly cookie for Next.js Middleware to consume
  const cookieStore = await cookies()
  const accessToken = await signAccessToken({
    id: user.id,
    email: user.email,
    roleId: finalRoleId,
    roleSlug: finalRoleSlug,
  })
  const refreshToken = await signRefreshToken({
    id: user.id,
    email: user.email,
  })

  cookieStore.set({
    name: 'session',
    value: token,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
  cookieStore.set({
    name: 'access_token',
    value: accessToken,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  })
  cookieStore.set({
    name: 'refresh_token',
    value: refreshToken,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      organizationSlug: activeMembership?.organization?.slug ?? null,
      roleId: finalRoleId ?? '',
      roleSlug: finalRoleSlug ?? null,
      rolePermissions: user.role?.permissions ?? memoryRole?.permissions ?? [],
      status: user.status,
      avatar: user.avatar,
      joinedAt: user.joinedAt.toISOString(),
      memberships: user.organizationMemberships.map(m => ({
        organizationId: m.organizationId,
        organizationSlug: m.organization.slug,
        organizationName: m.organization.name,
        organizationLogo: m.organization.logo,
        role: m.role,
        status: m.status
      })),
      mfa: {
        enabled: (user as any).mfaEnabled ?? false,
        method: (user as any).mfaMethod ?? null,
        required: (user as any).mfaRequired ?? false,
      },
    },
    token,
  })
}
