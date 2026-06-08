import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id }, select: { organizationId: true } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const access = await requireTenantAccess(job.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const applications = await prisma.jobApplication.findMany({
    where: { jobId: id, organizationId: job.organizationId },
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
  const job = await prisma.job.findUnique({ 
    where: { id },
    include: {
      organization: {
        select: { settings: true }
      }
    }
  })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const form = await req.formData()
  const fullName = String(form.get('fullName') || '').trim()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const phone = String(form.get('phone') || '').trim()

  if (!fullName || !email) {
    return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 })
  }

  // Same-job duplicate (friendly rejection)
  const existingByEmailSameJob = await prisma.jobApplication.findFirst({
    where: { jobId: id, email }
  })
  const existingByPhoneSameJob = phone
    ? await prisma.jobApplication.findFirst({
        where: { jobId: id, phone }
      })
    : null

  if (existingByEmailSameJob || existingByPhoneSameJob) {
    const target = existingByEmailSameJob || existingByPhoneSameJob
    if (target) {
      await prisma.jobApplication.update({
        where: { id: target.id },
        data: { isPotentialDuplicate: true },
      })

      await prisma.auditLog.create({
        data: {
          actorUserId: null,
          entityType: 'job_application',
          entityId: target.id,
          action: 'duplicate_application_attempt_rejected',
          beforeJson: { isPotentialDuplicate: target.isPotentialDuplicate },
          afterJson: { isPotentialDuplicate: true },
          metadataJson: {
            jobId: id,
            organizationId: job.organizationId,
            emailUsed: Boolean(existingByEmailSameJob),
            phoneUsed: Boolean(existingByPhoneSameJob),
            reason: 'same_job_duplicate_contact',
          },
        },
      })
    }

    return NextResponse.json({
      error: 'You have already applied for this job with this contact information.',
      duplicate: {
        emailUsed: Boolean(existingByEmailSameJob),
        phoneUsed: Boolean(existingByPhoneSameJob),
      },
    }, { status: 409 })
  }

  // Tenant-wide email dedupe check (audit-only; allow apply to a different job)
  const existingTenantEmail = await prisma.jobApplication.findFirst({
    where: {
      organizationId: job.organizationId,
      email,
    },
    orderBy: { createdAt: 'desc' },
  })

  // We intentionally avoid cross-job duplicate flagging.
  // Duplicate badge should appear only for same-job duplicate attempts.
  const possiblePhoneNameDuplicate = null

  let resumePath: string | null = null
  const resume = form.get('resume')
  if (resume && resume instanceof File && resume.size > 0) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    await mkdir(uploadDir, { recursive: true })
    const safeName = `${Date.now()}-${resume.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(uploadDir, safeName)
    const bytes = Buffer.from(await resume.arrayBuffer())
    await writeFile(filePath, bytes)
    resumePath = `/uploads/resumes/${safeName}`
  }

  // Parse custom JSON fields
  const parseJsonSafe = (val: FormDataEntryValue | null) => {
    if (!val) return null
    try { return JSON.parse(String(val)) } catch (e) { return null }
  }

  const customAnswers = parseJsonSafe(form.get('customAnswers'))
  const parsedSkills = parseJsonSafe(form.get('parsedSkills'))
  const parsedEducation = parseJsonSafe(form.get('parsedEducation'))
  const parsedWorkHistory = parseJsonSafe(form.get('parsedWorkHistory'))
  const parsedProjects = parseJsonSafe(form.get('parsedProjects'))
  const parsedSocialLinks = parseJsonSafe(form.get('parsedSocialLinks'))

  const parsedCertificates = parseJsonSafe(form.get('parsedCertificates'))
  const parsedAchievements = parseJsonSafe(form.get('parsedAchievements'))
  const parsedSummary = form.get('parsedSummary') ? String(form.get('parsedSummary')).trim() : null

  const application = await prisma.jobApplication.create({
    data: {
      jobId: id,
      organizationId: job.organizationId,
      fullName,
      email,
      phone: phone || null,
      location: String(form.get('location') || '').trim() || null,
      yearsExperience: form.get('yearsExperience') ? Number(form.get('yearsExperience')) : null,
      currentCompany: String(form.get('currentCompany') || '').trim() || null,
      expectedCtc: String(form.get('expectedCtc') || '').trim() || null,
      noticePeriod: String(form.get('noticePeriod') || '').trim() || null,
      linkedinUrl: String(form.get('linkedinUrl') || '').trim() || null,
      portfolioUrl: String(form.get('portfolioUrl') || '').trim() || null,
      githubUrl: String(form.get('githubUrl') || '').trim() || null,
      coverLetter: String(form.get('coverLetter') || '').trim() || null,
      resumePath,
      customAnswers,
      parsedSkills,
      parsedEducation,
      parsedWorkHistory,
      parsedProjects,
      parsedSocialLinks,
      parsedCertificates,
      parsedAchievements,
      parsedSummary,
      consentPrivacyPolicy: form.get('consentPrivacyPolicy') === 'true',
      consentDataProcessing: form.get('consentDataProcessing') === 'true',
      consentCommunication: form.get('consentCommunication') === 'true',
      isPotentialDuplicate: false,
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

  await prisma.jobApplicationStageHistory.create({
    data: {
      organizationId: application.organizationId,
      jobId: application.jobId,
      applicationId: application.id,
      fromStatus: null,
      toStatus: application.status || 'applied',
      changedByUserId: null,
      note: 'Initial application submission',
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      entityType: 'job_application',
      entityId: application.id,
      action: 'candidate_application_submitted',
      beforeJson: null,
      afterJson: {
        jobId: application.jobId,
        organizationId: application.organizationId,
        email: application.email,
        fullName: application.fullName,
      },
      metadataJson: {
        dedupeWithinTenantByEmailFound: Boolean(existingTenantEmail),
        potentialDuplicatePhoneName: Boolean(possiblePhoneNameDuplicate),
      },
    },
  })

  // Trigger Async AI Scoring if enabled
  const isAiEnabledForOrg = (job.organization as any)?.settings?.screening?.aiEnabled ?? true
  if (job.isAiScreeningEnabled && isAiEnabledForOrg) {
    const scoreUrl = new URL(`/api/jobs/${id}/applications/${application.id}/score`, req.url)
    fetch(scoreUrl, { method: 'POST' }).catch(err => console.error("Async scoring failed to trigger:", err))
  }

  return NextResponse.json({ application }, { status: 201 })
}
