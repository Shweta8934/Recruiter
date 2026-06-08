import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, signAccessToken, signToken } from '@/lib/server/jwt'
import { prisma } from '@/lib/server/prisma'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'Missing refresh token' }, { status: 401 })
  }

  const decoded = await verifyToken(refreshToken)
  if (!decoded || decoded.tokenType !== 'refresh' || !decoded.id) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: String(decoded.id) },
    select: { id: true, email: true, roleId: true, status: true },
  })

  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = await signAccessToken({
    id: user.id,
    email: user.email,
    roleId: user.roleId,
  })

  const sessionToken = await signToken({
    id: user.id,
    email: user.email,
    roleId: user.roleId,
  })

  cookieStore.set({ name: 'access_token', value: accessToken, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60 })
  cookieStore.set({ name: 'session', value: sessionToken, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 })

  return NextResponse.json({ success: true })
}
