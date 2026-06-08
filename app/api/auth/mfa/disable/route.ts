import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { getAuthenticatedUser } from '../_utils'

export async function POST() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      mfaEnabled: false,
      mfaMethod: null,
      mfaPhone: null,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaEnrolledAt: null,
    },
  })

  return NextResponse.json({ message: 'MFA disabled' })
}
