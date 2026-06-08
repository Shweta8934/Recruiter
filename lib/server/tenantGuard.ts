import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/server/jwt'
import { prisma } from '@/lib/server/prisma'

type SessionUser = {
  id: string
  roleSlug: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null

  const decoded = await verifyToken(session)
  if (!decoded?.id) return null

  return {
    id: decoded.id as string,
    roleSlug: (decoded.roleSlug as string | undefined) || null,
  }
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.roleSlug === 'super-admin'
}

export async function assertTenantMembership(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
    include: {
      organization: {
        select: { status: true },
      },
    },
  })

  // Primary check: active membership record
  if (membership && membership.status === 'active' && membership.organization.status === 'active') {
    return true
  }

  // Fallback: user's organizationId field matches (covers users not in membership table)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  })
  return user?.organizationId === organizationId
}

export async function requireTenantAccess(organizationId: string) {
  const user = await getSessionUser()
  if (!user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }

  if (isSuperAdmin(user)) {
    return { ok: true as const, user }
  }

  const allowed = await assertTenantMembership(user.id, organizationId)
  if (!allowed) {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  return { ok: true as const, user }
}

