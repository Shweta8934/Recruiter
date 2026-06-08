import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { getAuthenticatedUser } from '../_utils'

const schema = z.object({
  method: z.enum(['totp', 'sms']).default('totp'),
  phone: z.string().optional(),
})

export async function POST(req: Request) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid MFA enrollment payload' }, { status: 400 })
  }

  const { method, phone } = parsed.data

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      mfaMethod: method,
      mfaPhone: method === 'sms' ? phone ?? null : null,
      mfaEnabled: false,
      mfaEnrolledAt: null,
    },
  })

  return NextResponse.json({
    message: 'MFA enrollment initialized. Verification step is placeholder in current release.',
    nextStep: 'POST /api/auth/mfa/verify',
  })
}
