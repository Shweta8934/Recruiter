import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const createSchema = z.object({
  organizationId: z.string(),
  title: z.string().min(2),
  description: z.string().min(10),
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
  createdBy: z.string().optional(),
  questionPaperId: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('organizationId')
  if (!organizationId) return NextResponse.json({ jobs: [] })
  const access = await requireTenantAccess(organizationId)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const jobs = await prisma.job.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { applications: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ jobs })
}

export async function POST(req: Request) {
  try {
    const payload = createSchema.parse(await req.json())
    const perm = await requirePermission({ organizationId: payload.organizationId, module: 'jobs', action: 'create' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(payload.organizationId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    const slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

    // Keep create compatible with current DB schema columns.
    const experienceSummary = payload.experience?.trim() || null

    const job = await prisma.job.create({
      data: {
        organizationId: payload.organizationId,
        title: payload.title.trim(),
        slug: slug || `job-${Date.now()}`,
        description: payload.description.trim(),
        location: payload.location?.trim() || null,
        experience: experienceSummary,
        employmentType: payload.employmentType?.trim() || null,
        duration: payload.duration?.trim() || null,
        skills: payload.skills || null,
        experienceMin: payload.experienceMin ?? null,
        experienceMax: payload.experienceMax ?? null,
        salaryMin: payload.salaryMin ?? null,
        salaryMax: payload.salaryMax ?? null,
        departmentId: payload.departmentId || null,
        isAiScreeningEnabled: payload.isAiScreeningEnabled ?? true,
        customQuestions: payload.customQuestions || null,
        createdBy: payload.createdBy,
        status: 'open',
      },
    })

    if (payload.questionPaperId && payload.questionPaperId !== 'none') {
      await prisma.questionPaper.update({
        where: { id: payload.questionPaperId },
        data: { jobId: job.id }
      })
    }

    return NextResponse.json({ job }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      const message = e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const message = e instanceof Error ? e.message : 'Failed to create job post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
