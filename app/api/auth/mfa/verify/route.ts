import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { getAuthenticatedUser } from '../_utils'

const schema = z.object({
  code: z.string().min(4),
})

export async function POST(req: Request) {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid verification payload' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      mfaEnabled: true,
      mfaEnrolledAt: new Date(),
    },
  })

  return NextResponse.json({
    message: 'MFA marked as verified (placeholder validation). Replace with real provider verification before production enforcement.',
  })
}
