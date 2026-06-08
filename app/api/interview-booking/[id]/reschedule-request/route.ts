import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { sendRescheduleRequestEmail } from '@/lib/server/email'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { reason } = await req.json()

    if (!reason) {
      return NextResponse.json({ error: 'Missing reason' }, { status: 400 })
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: true
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Update application status to reschedule_requested
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        status: 'reschedule_requested'
      }
    })

    await prisma.auditLog.create({
      data: {
        entityType: 'jobApplication',
        entityId: id,
        action: 'reschedule_requested',
        metadataJson: { reason },
        actorUserId: null, // candidate action
      }
    });

    // Try to find the recruiter who assigned this interview
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityId: id,
        action: 'interview_assigned'
      },
      orderBy: { createdAt: 'desc' },
      include: { actor: true }
    });

    let recruiterEmail = auditLog?.actor?.email;
    let recruiterName = auditLog?.actor?.name || 'Recruiter';

    // Fallback: Get an org admin if no specific recruiter was assigned
    if (!recruiterEmail) {
      const adminRole = await prisma.role.findFirst({
        where: { slug: 'org-admin' }
      });
      if (adminRole) {
        const admin = await prisma.user.findFirst({
          where: { organizationId: application.organizationId, roleId: adminRole.id }
        });
        if (admin) {
          recruiterEmail = admin.email;
          recruiterName = admin.name;
        }
      }
    }

    // Send email to recruiter
    if (recruiterEmail) {
      await sendRescheduleRequestEmail({
        toEmail: recruiterEmail,
        recruiterName,
        candidateName: application.fullName,
        jobTitle: application.job.title,
        reason
      }).catch(e => console.warn('Failed to send reschedule request email', e));
    }

    return NextResponse.json({ success: true, application: updated })
  } catch (e: any) {
    console.error("Reschedule Request Error:", e);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
