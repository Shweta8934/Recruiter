import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getTenantPrisma, getTenantContext } from '@/lib/server/tenantContext'

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  experience: z.string().optional(),
  createdBy: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  experienceMin: z.number().optional().nullable(),
  experienceMax: z.number().optional().nullable(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
})

export async function GET(req: Request) {
  try {
    const prisma = await getTenantPrisma()
    
    // Automatically filtered by organizationId from getTenantPrisma!
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        _count: { select: { applications: true } },
        department: true
      },
    })
    return NextResponse.json({ jobs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const prisma = await getTenantPrisma()
    const ctx = await getTenantContext()
    
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = createSchema.parse(await req.json())
    const slug = payload.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

    // organizationId is automatically inferred by getTenantPrisma, but we can also set it explicitly 
    // since we know ctx.organizationId is secure.
    const job = await prisma.job.create({
      data: {
        organizationId: ctx.organizationId,
        title: payload.title.trim(),
        slug: slug || `job-${Date.now()}`,
        description: payload.description?.trim() || null,
        status: payload.status || 'open',
        location: payload.location?.trim() || null,
        experience: payload.experience?.trim() || null,
        createdBy: payload.createdBy,
        departmentId: payload.departmentId || null,
        employmentType: payload.employmentType?.trim() || null,
        duration: payload.duration?.trim() || null,
        skills: payload.skills || null,
        experienceMin: payload.experienceMin || null,
        experienceMax: payload.experienceMax || null,
        salaryMin: payload.salaryMin || null,
        salaryMax: payload.salaryMax || null,
      },
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bad Request' }, { status: 400 })
  }
}
