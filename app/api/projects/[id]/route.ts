import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const updateSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(30, "Project name cannot exceed 30 characters").optional(),
  description: z.string().min(30, "Description must be at least 30 characters").max(500, "Description cannot exceed 500 characters").optional().nullable().or(z.literal('')),
  status: z.string().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireTenantAccess(project.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  return NextResponse.json({ project })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = updateSchema.parse(await req.json())
  const existing = await prisma.project.findUnique({ where: { id }, select: { organizationId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const perm = await requirePermission({ organizationId: existing.organizationId, module: 'jobs', action: 'update' })
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const access = await requireTenantAccess(existing.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: payload.name?.trim(),
      description: payload.description?.trim() || payload.description || null,
      status: payload.status,
    },
    include: { members: { include: { user: true } } },
  })
  return NextResponse.json({ project })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.project.findUnique({ where: { id }, select: { organizationId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const perm = await requirePermission({ organizationId: existing.organizationId, module: 'jobs', action: 'delete' })
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const access = await requireTenantAccess(existing.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
