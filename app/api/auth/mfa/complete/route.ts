import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken, signToken, signAccessToken, signRefreshToken } from '@/lib/server/jwt'
import { prisma } from '@/lib/server/prisma'
import { roles } from '@/data/roles'
import { cookies } from 'next/headers'

const schema = z.object({
  mfaToken: z.string(),
  code: z.string().min(4),
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  const decoded = await verifyToken(parsed.data.mfaToken)
  if (!decoded || decoded.tokenType !== 'mfa_challenge' || !decoded.id) {
    return NextResponse.json({ error: 'Invalid or expired MFA token' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: String(decoded.id) },
    include: { role: true, organizationMemberships: { include: { organization: true } } },
  })

  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activeMembership = user.organizationMemberships.find(m => m.organizationId === user.organizationId)
  const memoryRole = activeMembership ? roles.find(r => r.slug === activeMembership.role) : null
  const finalRoleId = user.roleId || memoryRole?.id || null
  const finalRoleSlug = user.role?.slug || memoryRole?.slug

  const sessionToken = await signToken({ id: user.id, email: user.email, roleId: finalRoleId, roleSlug: finalRoleSlug })
  const accessToken = await signAccessToken({ id: user.id, email: user.email, roleId: finalRoleId, roleSlug: finalRoleSlug })
  const refreshToken = await signRefreshToken({ id: user.id, email: user.email })

  const cookieStore = await cookies()
  cookieStore.set({ name: 'session', value: sessionToken, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 })
  cookieStore.set({ name: 'access_token', value: accessToken, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60 })
  cookieStore.set({ name: 'refresh_token', value: refreshToken, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 })

  return NextResponse.json({ success: true })
}
