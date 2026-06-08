import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { organizationId: true } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const access = await requireTenantAccess(job.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const applications = await prisma.jobApplication.findMany({
    where: { jobId: id },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch reschedule reasons from AuditLog since there is no direct relation
  const rescheduleLogs = await prisma.auditLog.findMany({
    where: {
      action: 'reschedule_requested',
      entityId: { in: applications.map(a => a.id) }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Attach logs to applications
  const applicationsWithLogs = applications.map(app => {
    return {
      ...app,
      auditLogs: rescheduleLogs.filter(log => log.entityId === app.id)
    }
  });

  return NextResponse.json({ applications: applicationsWithLogs })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const access = await requireTenantAccess(job.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const form = await req.formData()
  const fullName = String(form.get('fullName') || '').trim()
  const email = String(form.get('email') || '').trim().toLowerCase()
  if (!fullName || !email) {
    return NextResponse.json({ error: 'fullName and email are required' }, { status: 400 })
  }

  const existingApp = await prisma.jobApplication.findFirst({
    where: { jobId: id, email }
  })
  if (existingApp) {
    return NextResponse.json({ error: 'You have already applied for this job with this email address.' }, { status: 400 })
  }

  let resumePath: string | null = null
  const resume = form.get('resume')
  if (resume && resume instanceof File && resume.size > 0) {
    const dir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    await mkdir(dir, { recursive: true })
    const filename = `${Date.now()}-${resume.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(dir, filename)
    await writeFile(filePath, Buffer.from(await resume.arrayBuffer()))
    resumePath = `/uploads/resumes/${filename}`
  }

  const application = await prisma.jobApplication.create({
    data: {
      jobId: id,
      organizationId: job.organizationId,
      fullName,
      email,
      phone: String(form.get('phone') || '').trim() || null,
      location: String(form.get('location') || '').trim() || null,
      yearsExperience: form.get('yearsExperience') ? Number(form.get('yearsExperience')) : null,
      currentCompany: String(form.get('currentCompany') || '').trim() || null,
      expectedCtc: String(form.get('expectedCtc') || '').trim() || null,
      noticePeriod: String(form.get('noticePeriod') || '').trim() || null,
      linkedinUrl: String(form.get('linkedinUrl') || '').trim() || null,
      portfolioUrl: String(form.get('portfolioUrl') || '').trim() || null,
      coverLetter: String(form.get('coverLetter') || '').trim() || null,
      resumePath,
      status: 'applied',
    },
  })

  // Link any pre-existing test attempts for this candidate for this job title
  await prisma.candidateTestAttempt.updateMany({
    where: {
      email: email,
      questionPaper: {
        jobTitle: job.title
      },
      jobApplicationId: null
    },
    data: {
      jobApplicationId: application.id
    }
  })

  return NextResponse.json({ application }, { status: 201 })
}
