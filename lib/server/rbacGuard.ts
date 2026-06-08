import { headers } from 'next/headers'
import { prisma } from './prisma'
import { getSessionUser, isSuperAdmin, assertTenantMembership } from './tenantGuard'
import { roles } from '@/data/roles'
import type { Action, Module } from '@/types/rbac'

function hasPermissionFromRoleSlug(roleSlug: string | null | undefined, module: Module, action: Action) {
  if (!roleSlug) return false
  if (roleSlug === 'super-admin' || roleSlug === 'org-admin' || roleSlug === 'hr' || roleSlug === 'recruiter') return true
  const role = roles.find((r) => r.slug === roleSlug)
  if (!role) return false
  const candidates = [`${module}-${action}`, `${module}:${action}`]
  return candidates.some((p) => role.permissions.includes(p))
}

export async function logPermissionDenied(params: {
  actorUserId?: string | null
  organizationId?: string | null
  module: Module
  action: Action
  reason: string
}) {
  try {
    const h = await headers()
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        entityType: 'permission',
        entityId: params.organizationId || 'global',
        action: 'update',
        metadataJson: {
          denied: true,
          module: params.module,
          action: params.action,
          reason: params.reason,
          path: h.get('x-pathname') || '',
          method: h.get('x-method') || '',
        } as any,
      },
    })
  } catch {}
}

export async function requirePermission(args: {
  organizationId: string
  module: Module
  action: Action
}) {
  const user = await getSessionUser()
  if (!user) {
    await logPermissionDenied({ module: args.module, action: args.action, organizationId: args.organizationId, reason: 'unauthorized' })
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }
  if (isSuperAdmin(user)) return { ok: true as const, user }

  const member = await assertTenantMembership(user.id, args.organizationId)
  if (!member) {
    await logPermissionDenied({ actorUserId: user.id, module: args.module, action: args.action, organizationId: args.organizationId, reason: 'no_membership' })
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: args.organizationId } },
    select: { role: true },
  })
  const allowed = hasPermissionFromRoleSlug(membership?.role, args.module, args.action)
  if (!allowed) {
    await logPermissionDenied({ actorUserId: user.id, module: args.module, action: args.action, organizationId: args.organizationId, reason: 'missing_permission' })
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }
  return { ok: true as const, user }
}
