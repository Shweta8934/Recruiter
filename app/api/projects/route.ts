import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const createSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(3, "Project name must be at least 3 characters").max(30, "Project name cannot exceed 30 characters"),
  description: z.string().min(30, "Description must be at least 30 characters").max(500, "Description cannot exceed 500 characters").optional().or(z.literal('')),
  status: z.string().optional(),
  createdBy: z.string().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('organizationId')
  const requesterUserId = searchParams.get('requesterUserId')
  if (!organizationId) return NextResponse.json({ projects: [] })
  const access = await requireTenantAccess(organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  if (requesterUserId) {
    const requester = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { role: true },
    })
    const isHr = requester?.role?.slug === 'hr'
    if (isHr) {
      if (requester.organizationId !== organizationId) {
        return NextResponse.json({ projects: [] })
      }
      const projects = await prisma.project.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        include: { members: { include: { user: true } } },
      })
      return NextResponse.json({ projects })
    }
  }

  const projects = await prisma.project.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      members: {
        include: { user: true },
      },
    },
  })
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const payload = createSchema.parse(await req.json())
  const perm = await requirePermission({ organizationId: payload.organizationId, module: 'jobs', action: 'create' })
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const access = await requireTenantAccess(payload.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const slug = payload.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const project = await prisma.project.create({
    data: {
      organizationId: payload.organizationId,
      name: payload.name.trim(),
      slug: slug || `project-${Date.now()}`,
      description: payload.description?.trim() || null,
      status: payload.status || 'active',
      createdBy: payload.createdBy,
    },
  })

  return NextResponse.json({ project }, { status: 201 })
}
