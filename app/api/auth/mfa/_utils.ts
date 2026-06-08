import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/server/jwt'
import { prisma } from '@/lib/server/prisma'

export async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value

  if (!session) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  const decoded = await verifyToken(session)
  const userId = decoded?.id as string | undefined

  if (!userId) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      mfaEnabled: true,
      mfaMethod: true,
      mfaPhone: true,
      mfaEnrolledAt: true,
      mfaRequired: true,
      status: true,
    },
  })

  if (!user) {
    return { error: 'Unauthorized', status: 401 as const }
  }

  if (user.status !== 'active') {
    return { error: 'Account inactive', status: 403 as const }
  }

  return { user }
}
