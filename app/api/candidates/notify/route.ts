import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendGenericEmail } from '@/lib/server/mailer'
import { prisma } from '@/lib/server/prisma'
import { getSessionUser } from '@/lib/server/tenantGuard'

const schema = z.object({
  applicationId: z.string().optional(),
  interviewerUserId: z.string().optional(),
  to: z.string().email(),
  candidateName: z.string().min(1),
  jobTitle: z.string().min(1),
  type: z.enum(['interview', 'test', 'status_update']),
  actorName: z.string().optional(),
  organizationName: z.string().optional(),
  date1: z.string().optional(),
  date2: z.string().optional(),
  newStatus: z.string().optional(),
  interviewerIds: z.array(z.string()).optional(),
  roundId: z.string().optional(),
  duration: z.number().optional(),
  meetLink: z.string().optional(),
  isReschedule: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const payload = schema.parse(await req.json())
    const sessionUser = await getSessionUser()

    const org = payload.organizationName || 'our company'
    const actor = payload.actorName || 'Recruiter'

    if (payload.type === 'interview' && payload.applicationId && payload.date1 && payload.date2) {
      await prisma.jobApplication.update({
        where: { id: payload.applicationId },
        data: {
          interviewDate1: new Date(payload.date1),
          interviewDate2: new Date(payload.date2),
          interviewSelectedDate: null,
          status: 'interview',
        }
      })

      if (payload.isReschedule) {
        // Find the old scheduled interviews
        const oldInterviews = await prisma.interview.findMany({
          where: { applicationId: payload.applicationId, status: 'scheduled' },
          include: { participants: { include: { user: true } }, application: { include: { job: true } } }
        });

        for (const oldInterview of oldInterviews) {
          // Notify interviewers that the old slot is cancelled due to reschedule
          for (const p of oldInterview.participants) {
            if (p.user.email) {
              import('@/lib/server/email').then(m => m.sendInterviewCancelledEmail({
                toEmail: p.user.email!,
                candidateName: oldInterview.application.fullName,
                jobTitle: oldInterview.application.job.title,
                reason: 'Interview is being rescheduled',
                isInterviewer: true
              })).catch(e => console.error(e));
            }
          }
          
          // Delete old calendar events
          if (oldInterview.eventId) {
            import('@/lib/server/calendar').then(m => m.deleteCalendarEvent(oldInterview.eventId!)).catch(e => console.error(e));
          }
        }

        // Cancel the old interview records
        await prisma.interview.updateMany({
          where: { applicationId: payload.applicationId, status: 'scheduled' },
          data: { status: 'rescheduled' }
        });
      }

      await prisma.auditLog.create({
        data: {
          actorUserId: sessionUser?.id || null,
          entityType: 'job_application',
          entityId: payload.applicationId,
          action: 'interview_assigned',
          beforeJson: null,
          afterJson: {
            interviewDate1: payload.date1,
            interviewDate2: payload.date2,
          },
          metadataJson: {
            assignedInterviewerUserId: payload.interviewerUserId || null,
            interviewerIds: payload.interviewerIds || null,
            roundId: payload.roundId || null,
            duration: payload.duration || 60,
            meetLink: payload.meetLink || null,
          },
        },
      })
    }

    const subject =
      payload.type === 'interview'
        ? (payload.isReschedule ? `Interview Rescheduled - ${payload.jobTitle}` : `Interview Invitation - ${payload.jobTitle}`)
        : payload.type === 'status_update'
        ? `Application Update - ${payload.jobTitle}`
        : `Test Assignment - ${payload.jobTitle}`

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const bookingLink = `${baseUrl}/interview-booking/${payload.applicationId}`

    const html =
      payload.type === 'interview'
        ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${payload.isReschedule ? 'Interview Rescheduled' : 'Interview Invitation'}</h2>
            <p>Hi ${payload.candidateName},</p>
            <p>${actor} from ${org} ${payload.isReschedule ? 'has proposed new times for your interview for the' : 'invited you for an interview for the'} <strong>${payload.jobTitle}</strong> position.</p>
            <p>Please click the button below to select the time that works best for you.</p>
            <a href="${bookingLink}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0;">Select Interview Time</a>
            <p>We look forward to speaking with you!</p>
          </div>
        `
        : payload.type === 'status_update'
        ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Application Update</h2>
            <p>Hi ${payload.candidateName},</p>
            <p>This is an update regarding your application for <strong>${payload.jobTitle}</strong> at ${org}.</p>
            <p>Your application status has been updated to: <strong>${payload.newStatus?.replace('_', ' ').toUpperCase()}</strong>.</p>
            <p>We will be in touch with next steps soon.</p>
            <p>Best regards,<br/>${actor}</p>
          </div>
        `
        : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Test Assignment</h2>
            <p>Hi ${payload.candidateName},</p>
            <p>${actor} from ${org} shared a test assignment for <strong>${payload.jobTitle}</strong>.</p>
            <p>Please complete and reply with your submission.</p>
          </div>
        `

    const result = await sendGenericEmail({ to: payload.to, subject, html })
    if (!result.sent) {
      return NextResponse.json({ error: result.reason || 'MAIL_NOT_SENT' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to send candidate mail'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
