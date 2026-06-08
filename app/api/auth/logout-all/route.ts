import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/server/prisma'
import { admin } from '@/lib/server/firebase-admin'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt-do-not-use-in-production'
const encodedSecret = new TextEncoder().encode(JWT_SECRET)

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify and decode JWT to get user id
    let payload: any
    try {
      const result = await jwtVerify(sessionToken, encodedSecret)
      payload = result.payload
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const userId = payload.id as string

    // Get user's firebaseUid from DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firebaseUid: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 1. Revoke all Firebase refresh tokens for this user
    if (user.firebaseUid) {
      await admin.auth().revokeRefreshTokens(user.firebaseUid)
    }

    // 2. Store revocation timestamp in DB so proxy can block old sessions
    await prisma.user.update({
      where: { id: userId },
      data: { tokenRevokedAt: new Date() },
    })

    // 3. Clear the current session cookie
    const response = NextResponse.json({ ok: true, message: 'Signed out from all devices' })
    response.cookies.set({
      name: 'session',
      value: '',
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })
    response.cookies.set({ name: 'access_token', value: '', httpOnly: true, maxAge: 0, path: '/' })
    response.cookies.set({ name: 'refresh_token', value: '', httpOnly: true, maxAge: 0, path: '/' })

    return response
  } catch (error: any) {
    console.error('Logout all error:', error)
    return NextResponse.json({ error: 'Failed to sign out from all devices' }, { status: 500 })
  }
}
