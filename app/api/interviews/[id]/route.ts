import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/tenantGuard";
import { prisma } from "@/lib/server/prisma";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/server/calendar";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { scheduledAt, duration, status, reason } = body; // Reschedule or Cancel

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        application: { include: { job: true } },
        participants: { include: { user: true } },
      }
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (duration) updateData.duration = Number(duration);
    if (status) updateData.status = status; // e.g., 'cancelled', 'rescheduled'

    const updated = await prisma.interview.update({
      where: { id },
      data: updateData,
    });

    // Handle Cancellation
    if (status === 'cancelled') {
      const candidateEmail = interview.application.email;
      const jobTitle = interview.application.job.title;
      const candidateName = interview.application.fullName;
      const cancelReason = reason || "No reason provided";

      // 1. Send to candidate
      await import("@/lib/server/email").then(m => m.sendInterviewCancelledEmail({
        toEmail: candidateEmail,
        candidateName,
        jobTitle,
        reason: cancelReason,
        isInterviewer: false
      })).then(() => console.warn("Successfully sent cancellation email to candidate:", candidateEmail))
        .catch(e => console.error("Failed to send cancellation to candidate", e));

      // 2. Send to interviewers
      for (const p of interview.participants) {
        if (p.user.email) {
          await import("@/lib/server/email").then(m => m.sendInterviewCancelledEmail({
            toEmail: p.user.email!,
            candidateName,
            jobTitle,
            reason: cancelReason,
            isInterviewer: true
          })).then(() => console.warn("Successfully sent cancellation email to interviewer:", p.user.email))
            .catch(e => console.error("Failed to send cancellation to interviewer", e));
        }
      }

      // 3. Update application status
      await prisma.jobApplication.update({
        where: { id: interview.applicationId },
        data: { status: 'interview_cancelled' }
      });

      await prisma.jobApplicationStageHistory.create({
        data: {
          organizationId: interview.organizationId,
          jobId: interview.jobId,
          applicationId: interview.applicationId,
          fromStatus: interview.application.status,
          toStatus: 'interview_cancelled',
          changedByUserId: session.id,
          note: cancelReason,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: session.id,
          entityType: 'job_application',
          entityId: interview.applicationId,
          action: 'application_status_updated',
          beforeJson: {
            status: interview.application.status,
          },
          afterJson: {
            status: 'interview_cancelled',
          },
          metadataJson: {
            jobId: interview.jobId,
            reason: cancelReason,
          },
        },
      });
    }

    // Handle Completion
    if (status === 'completed') {
      await prisma.jobApplication.update({
        where: { id: interview.applicationId },
        data: { status: 'interview_completed' }
      });

      await prisma.jobApplicationStageHistory.create({
        data: {
          organizationId: interview.organizationId,
          jobId: interview.jobId,
          applicationId: interview.applicationId,
          fromStatus: interview.application.status,
          toStatus: 'interview_completed',
          changedByUserId: session.id,
          note: "Interview completed",
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: session.id,
          entityType: 'job_application',
          entityId: interview.applicationId,
          action: 'application_status_updated',
          beforeJson: {
            status: interview.application.status,
          },
          afterJson: {
            status: 'interview_completed',
          },
          metadataJson: {
            jobId: interview.jobId,
            reason: "Interview marked as completed",
          },
        },
      });
    }

    // Log the update
    await prisma.auditLog.create({
      data: {
        entityType: 'interview',
        entityId: interview.id,
        action: status ? `interview_${status}` : 'interview_updated',
        metadataJson: { reason, scheduledAt, duration },
        actorUserId: session.id,
      }
    });

    // Sync with Google Calendar if event exists
    if (interview.eventId) {
      if (status === 'cancelled') {
        await deleteCalendarEvent(interview.eventId).catch(e => console.warn('Failed to delete calendar event', e));
      } else if (scheduledAt || duration) {
        await updateCalendarEvent(interview.eventId, {
          startTime: scheduledAt ? new Date(scheduledAt) : undefined,
          durationMinutes: duration ? Number(duration) : undefined,
        }).catch(e => console.warn('Failed to update calendar event', e));
      }
    }

    return NextResponse.json({ success: true, interview: updated });
  } catch (error: any) {
    console.error("Error updating interview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
