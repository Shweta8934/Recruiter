import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { sendGenericEmail } from '@/lib/server/mailer'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

const schema = z.object({
  candidateName: z.string().min(2),
  email: z.string().email(),
  requesterUserId: z.string(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = schema.parse(await req.json())

    // Validate requester and role
    const requester = await prisma.user.findUnique({
      where: { id: payload.requesterUserId },
      include: { role: true, organization: true },
    })

    if (!requester || !requester.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAuthorized = requester.role.slug === 'hr' || requester.role.slug === 'recruiter'
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Only HR or Recruiters can invite candidates.' }, { status: 403 })
    }

    // Check if the job exists and belongs to the same organization
    const job = await prisma.job.findUnique({
      where: { id },
      include: { organization: true },
    })

    if (!job || job.organizationId !== requester.organizationId) {
      return NextResponse.json({ error: 'Job not found or unauthorized for this organization.' }, { status: 404 })
    }
    const access = await requireTenantAccess(job.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Check if the candidate was already invited for this job
    const existingInvite = await prisma.jobCandidateInvite.findFirst({
      where: {
        jobId: job.id,
        email: payload.email,
      },
    })

    if (existingInvite) {
      return NextResponse.json({ error: 'This candidate has already been invited to this job.' }, { status: 400 })
    }

    // Create the DB record
    const invite = await prisma.jobCandidateInvite.create({
      data: {
        jobId: job.id,
        organizationId: job.organizationId,
        email: payload.email,
        candidateName: payload.candidateName,
        invitedBy: requester.id,
        status: 'pending',
      },
    })

    // Send the email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const applyLink = `${baseUrl}/careers/${job.id}/apply`

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.5; color: #333;">
        <h2 style="color: #111;">Job Application Invitation</h2>
        <p>Hi ${payload.candidateName},</p>
        <p><strong>${requester.name}</strong> from <strong>${requester.organization?.name || 'our organization'}</strong> has invited you to apply for the position of <strong>${job.title}</strong>.</p>
        <p>We think you would be a great fit and would love to review your application. Please click the button below to view the job details and submit your application.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${applyLink}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Apply for ${job.title}</a>
        </div>
        <p>We look forward to hearing from you!</p>
      </div>
    `

    const result = await sendGenericEmail({
      to: payload.email,
      subject: `Invitation to apply: ${job.title} at ${requester.organization?.name || 'our organization'}`,
      html,
    })

    if (!result.sent) {
      console.error('Failed to send candidate invite email', result.reason)
      return NextResponse.json({ error: 'Failed to send the email, but record was created.' }, { status: 500 })
    }

    return NextResponse.json({ invite }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      const message = e.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const message = e instanceof Error ? e.message : 'An error occurred while sending the invite.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
// trigger rebuild
