import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'
import { requireTenantAccess, getSessionUser, isSuperAdmin } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  color: z.string().optional(),
  actorUserId: z.string().optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Must be authenticated at minimum
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Super admins can view all roles
  if (isSuperAdmin(sessionUser)) return NextResponse.json({ role })

  // System roles are shared role definitions — any authenticated user can view them
  if (role.isSystem) return NextResponse.json({ role })

  // Global roles (no org) — any authenticated user can view
  if (!role.organizationId) return NextResponse.json({ role })

  // Custom org roles — require org membership
  const access = await requireTenantAccess(role.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  return NextResponse.json({ role })
}


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await prisma.role.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Super admins can update any role
  if (!isSuperAdmin(sessionUser)) {
    // Get the user's actual org from DB (source of truth)
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { organizationId: true },
    })
    const userOrgId = dbUser?.organizationId

    if (!userOrgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Check roles:update permission against the user's own org
    const perm = await requirePermission({ organizationId: userOrgId, module: 'roles', action: 'update' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  }

  const json = await req.json()
  const payload = updateSchema.parse(json)
  const { actorUserId, ...data } = payload

  const updated = await prisma.role.update({ where: { id }, data })
  await logAudit({ actorUserId, entityType: 'role', entityId: id, action: 'update', before, after: updated })

  return NextResponse.json({ role: updated })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actorUserId = new URL(req.url).searchParams.get('actorUserId') ?? undefined
  const before = await prisma.role.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // System roles can never be deleted
  if (before.isSystem) return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 403 })

  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Super admins can delete any custom role
  if (!isSuperAdmin(sessionUser)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { organizationId: true },
    })
    const userOrgId = dbUser?.organizationId

    if (!userOrgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const perm = await requirePermission({ organizationId: userOrgId, module: 'roles', action: 'delete' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  }

  await prisma.role.delete({ where: { id } })
  await logAudit({ actorUserId, entityType: 'role', entityId: id, action: 'delete', before })
  return NextResponse.json({ ok: true })
}
