import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { getSessionUser } from '@/lib/server/tenantGuard'
import { sendRescheduleRejectedEmail } from '@/lib/server/email'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params // this is the applicationId

    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: true
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Revert status from 'reschedule_requested' back to 'interview_scheduled' or clear it
    // Wait, if they reject the reschedule, what happens to the interview?
    // It remains in the original state, but we should clear the 'reschedule_requested' status.
    // If they already had a confirmed interview, status is 'interview_scheduled'.
    // If they were pending confirmation, it's just 'interview'.
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        status: application.interviewSelectedDate ? 'interview_scheduled' : 'interview'
      }
    })

    // Log the rejection
    await prisma.auditLog.create({
      data: {
        entityType: 'jobApplication',
        entityId: id,
        action: 'reschedule_rejected',
        metadataJson: {},
        actorUserId: session.id,
      }
    });

    // Send email to candidate
    await sendRescheduleRejectedEmail({
      toEmail: application.email,
      candidateName: application.fullName,
      jobTitle: application.job.title,
    }).catch(e => console.warn('Failed to send reschedule rejection email', e));

    return NextResponse.json({ success: true, application: updated })
  } catch (e: any) {
    console.error("Reschedule Reject Error:", e);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
