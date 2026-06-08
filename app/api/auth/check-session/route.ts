import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/server/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt-do-not-use-in-production'
const encodedSecret = new TextEncoder().encode(JWT_SECRET)

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json({ valid: false, reason: 'no_session' }, { status: 401 })
    }

    // Verify JWT
    let payload: any
    try {
      const result = await jwtVerify(sessionToken, encodedSecret)
      payload = result.payload
    } catch {
      return NextResponse.json({ valid: false, reason: 'invalid_token' }, { status: 401 })
    }

    const userId = payload.id as string

    // Check if session was revoked in DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenRevokedAt: true, status: true },
    })

    if (!user) {
      return NextResponse.json({ valid: false, reason: 'user_not_found' }, { status: 401 })
    }

    if (user.status !== 'active') {
      return NextResponse.json({ valid: false, reason: 'account_inactive' }, { status: 403 })
    }

    // Check revocation: if token was issued BEFORE the revocation timestamp → invalid
    if (user.tokenRevokedAt) {
      const tokenIssuedAt = (payload.iat as number) * 1000 // JWT iat is in seconds
      // Allow a 5-second grace period to handle timestamp truncation and minor clock drift
      if (tokenIssuedAt < user.tokenRevokedAt.getTime() - 5000) {
        return NextResponse.json({ valid: false, reason: 'session_revoked' }, { status: 401 })
      }
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ valid: false, reason: 'server_error' }, { status: 500 })
  }
}
