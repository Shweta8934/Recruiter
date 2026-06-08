import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  location: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  experienceMin: z.number().optional().nullable(),
  experienceMax: z.number().optional().nullable(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: { 
      applications: { orderBy: { createdAt: 'desc' } },
      department: true
    },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireTenantAccess(job.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  return NextResponse.json({ job })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = updateSchema.parse(await req.json())
  const existing = await prisma.job.findUnique({ where: { id }, select: { organizationId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const perm = await requirePermission({ organizationId: existing.organizationId, module: 'jobs', action: 'update' })
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const access = await requireTenantAccess(existing.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const job = await prisma.job.update({
    where: { id },
    data: {
      title: payload.title?.trim(),
      description: payload.description?.trim() || payload.description || null,
      status: payload.status,
      location: payload.location?.trim() || payload.location || null,
      experience: payload.experience?.trim() || payload.experience || null,
      departmentId: payload.departmentId,
      employmentType: payload.employmentType?.trim() || payload.employmentType || null,
      duration: payload.duration?.trim() || payload.duration || null,
      skills: payload.skills,
      experienceMin: payload.experienceMin,
      experienceMax: payload.experienceMax,
      salaryMin: payload.salaryMin,
      salaryMax: payload.salaryMax,
    },
  })
  return NextResponse.json({ job })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.job.findUnique({ where: { id }, select: { organizationId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const perm = await requirePermission({ organizationId: existing.organizationId, module: 'jobs', action: 'delete' })
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const access = await requireTenantAccess(existing.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  await prisma.job.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
