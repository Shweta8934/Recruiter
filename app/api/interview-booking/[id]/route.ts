import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { sendGenericEmail } from '@/lib/server/mailer'
import { format } from 'date-fns'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: { select: { title: true } },
        job: true // need organization to display org info maybe?
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ application })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { selectedDate } = await req.json()

    if (!selectedDate) {
      return NextResponse.json({ error: 'Missing selected date' }, { status: 400 })
    }

    const application = await prisma.jobApplication.update({
      where: { id },
      data: {
        interviewSelectedDate: new Date(selectedDate),
        status: 'interview_scheduled'
      },
      include: {
        job: true
      }
    })

    // Try to find the recruiter who assigned this interview
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityId: id,
        action: 'interview_assigned'
      },
      orderBy: { createdAt: 'desc' }
    });

    let interviewerUserId = (auditLog?.metadataJson as any)?.assignedInterviewerUserId;
    let interviewerIds = (auditLog?.metadataJson as any)?.interviewerIds || [];
    const roundId = (auditLog?.metadataJson as any)?.roundId || null;
    const durationMinutes = (auditLog?.metadataJson as any)?.duration || 60;
    const meetLink: string | null = (auditLog?.metadataJson as any)?.meetLink || null;

    if (interviewerUserId && !interviewerIds.includes(interviewerUserId)) {
      interviewerIds.push(interviewerUserId);
    }

    // Fallback: Get an org admin if no specific interviewer was assigned
    if (interviewerIds.length === 0) {
      const adminRole = await prisma.role.findFirst({
        where: { slug: 'org-admin' }
      });
      if (adminRole) {
        const admin = await prisma.user.findFirst({
          where: { organizationId: application.organizationId, roleId: adminRole.id }
        });
        if (admin) interviewerIds.push(admin.id);
      }
    }

    const startTime = new Date(selectedDate);

    // Create the Interview in DB
    const interview = await prisma.interview.create({
      data: {
        organizationId: application.organizationId,
        jobId: application.jobId,
        applicationId: id,
        roundId: roundId,
        scheduledAt: startTime,
        duration: durationMinutes,
        meetLink: meetLink,
        participants: interviewerIds.length > 0 ? {
          create: interviewerIds.map((userId: string) => ({ userId }))
        } : undefined
      }
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'jobApplication',
        entityId: id,
        action: 'interview_confirmed',
        metadataJson: { scheduledAt: startTime, interviewId: interview.id },
        actorUserId: null, // candidate action (unauthenticated)
      }
    });

    // Fetch interviewer emails for confirmation
    let interviewers: { name: string; email: string }[] = [];
    if (interviewerIds.length > 0) {
      interviewers = await prisma.user.findMany({
        where: { id: { in: interviewerIds } },
        select: { name: true, email: true }
      });
    }

    const formattedDate = format(startTime, "PPpp"); // e.g. Jun 10, 2026, 12:12 PM
    const meetLinkHtml = meetLink
      ? `<p style="margin-top:16px;">📹 <strong>Join Meeting:</strong> <a href="${meetLink}">${meetLink}</a></p>`
      : '';

    // Send confirmation email to Candidate
    await sendGenericEmail({
      to: application.email,
      subject: `Interview Confirmed — ${application.job.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>✅ Interview Confirmed!</h2>
          <p>Hi ${application.fullName},</p>
          <p>Your interview for <strong>${application.job.title}</strong> has been confirmed.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px; font-weight: bold;">Date & Time:</td><td style="padding: 8px;">${formattedDate} (IST)</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Duration:</td><td style="padding: 8px;">${durationMinutes} minutes</td></tr>
          </table>
          ${meetLinkHtml}
          <p>Good luck! 🎉</p>
        </div>
      `
    }).catch(e => console.warn('Failed to send candidate confirmation email', e));

    // Send confirmation email to each Interviewer
    for (const interviewer of interviewers) {
      await sendGenericEmail({
        to: interviewer.email,
        subject: `Interview Scheduled — ${application.fullName} for ${application.job.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>📅 Interview Scheduled</h2>
            <p>Hi ${interviewer.name},</p>
            <p>An interview has been confirmed with <strong>${application.fullName}</strong> for the <strong>${application.job.title}</strong> role.</p>
            <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
              <tr><td style="padding: 8px; font-weight: bold;">Candidate:</td><td style="padding: 8px;">${application.fullName} (${application.email})</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Date & Time:</td><td style="padding: 8px;">${formattedDate} (IST)</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Duration:</td><td style="padding: 8px;">${durationMinutes} minutes</td></tr>
            </table>
            ${meetLinkHtml}
          </div>
        `
      }).catch(e => console.warn(`Failed to send interviewer confirmation email to ${interviewer.email}`, e));
    }

    return NextResponse.json({ application, interview: { ...interview, meetLink } })
  } catch (e: any) {
    console.error("Booking Error:", e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
