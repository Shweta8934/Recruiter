import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  location: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  skills: z.array(z.string()).optional(),
  experienceMin: z.number().int().nullable().optional(),
  experienceMax: z.number().int().nullable().optional(),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  experience: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  isAiScreeningEnabled: z.boolean().optional(),
  customQuestions: z.any().optional(),
  status: z.string().optional(),
  questionPaperId: z.string().nullable().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      organization: {
        select: { name: true, email: true }
      },
      department: true
    }
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireTenantAccess(job.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  return NextResponse.json({ jobPost: job })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = updateSchema.parse(await req.json())
    const existing = await prisma.job.findUnique({ where: { id }, select: { organizationId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const perm = await requirePermission({ organizationId: existing.organizationId, module: 'jobs', action: 'update' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(existing.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const experienceSummary = payload.experience?.trim() || null

    const job = await prisma.job.update({
      where: { id },
      data: {
        title: payload.title?.trim(),
        description: payload.description?.trim(),
        location: payload.location?.trim() || payload.location || null,
        experience: experienceSummary,
        employmentType: payload.employmentType?.trim() || null,
        duration: payload.duration?.trim() || null,
        skills: payload.skills || [],
        experienceMin: payload.experienceMin,
        experienceMax: payload.experienceMax,
        salaryMin: payload.salaryMin,
        salaryMax: payload.salaryMax,
        departmentId: payload.departmentId || null,
        isAiScreeningEnabled: payload.isAiScreeningEnabled,
        customQuestions: payload.customQuestions,
        status: payload.status,
      },
    })

    if (payload.questionPaperId !== undefined) {
      await prisma.questionPaper.updateMany({
        where: { jobId: id },
        data: { jobId: null }
      })
      if (payload.questionPaperId && payload.questionPaperId !== 'none') {
        await prisma.questionPaper.update({
          where: { id: payload.questionPaperId },
          data: { jobId: id }
        })
      }
    }

    return NextResponse.json({ job })
  } catch (e) {
    if (e instanceof z.ZodError) {
      const message = e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const message = e instanceof Error ? e.message : 'Failed to update job post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
