import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string, appId: string }> }) {
  try {
    const { id, appId } = await params
    
    // Validate request body
    const body = await req.json()
    const { status, statusReason, aiFeedback, aiOverrideScore, aiFeedbackNote, recruiterNote } = body
    
    if (!status && !aiFeedback && aiOverrideScore === undefined && !recruiterNote) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
    }

    // Verify application exists and belongs to this job
    const existingApp = await prisma.jobApplication.findUnique({
      where: { id: appId }
    })
    
    if (!existingApp || existingApp.jobId !== id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingApp.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Update the application
    const before = existingApp
    const hasOverride = aiOverrideScore !== undefined && aiOverrideScore !== null
    const normalizedOverride = hasOverride ? Number(aiOverrideScore) : null
    if (hasOverride && (Number.isNaN(normalizedOverride) || normalizedOverride < 0 || normalizedOverride > 100)) {
      return NextResponse.json({ error: 'aiOverrideScore must be a number between 0 and 100' }, { status: 400 })
    }

    const updatedApp = await prisma.jobApplication.update({
      where: { id: appId },
      data: { 
        ...(status ? { status } : {}),
        ...(statusReason !== undefined ? { statusReason } : {}),
        ...(aiFeedback ? { aiFeedback } : {}),
        ...(hasOverride ? { aiScore: normalizedOverride, isAiOverridden: true } : {})
      }
    })

    if (recruiterNote) {
      await prisma.auditLog.create({
        data: {
          actorUserId: access.user.id,
          entityType: 'job_application',
          entityId: appId,
          action: 'recruiter_note_added',
          metadataJson: {
            note: recruiterNote,
            jobId: id,
          }
        }
      });
    }

    if (status && status !== before.status) {
      await prisma.jobApplicationStageHistory.create({
        data: {
          organizationId: updatedApp.organizationId,
          jobId: updatedApp.jobId,
          applicationId: updatedApp.id,
          fromStatus: before.status,
          toStatus: status,
          changedByUserId: access.user.id,
          note: statusReason || null,
        },
      })

      // Send email if a template is attached to this stage
      try {
        const stage = await prisma.jobStage.findFirst({
          where: { organizationId: updatedApp.organizationId, OR: [{ systemId: status }, { name: status }] }
        })
        
        if (stage?.emailTemplateId) {
          const template = await prisma.emailTemplate.findUnique({
            where: { id: stage.emailTemplateId }
          })
          
          if (template) {
            const job = await prisma.job.findUnique({ where: { id: updatedApp.jobId } })
            const { sendCandidateStageEmail } = await import('@/lib/server/email')
            await sendCandidateStageEmail({
              toEmail: updatedApp.email,
              candidateName: updatedApp.fullName,
              jobTitle: job?.title || 'the position',
              subjectTemplate: template.subject,
              bodyTemplate: template.body
            })
          }
        }
      } catch (emailErr) {
        console.error('Failed to send stage transition email:', emailErr)
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: access.user.id,
        entityType: 'job_application',
        entityId: appId,
        action: hasOverride ? 'ai_score_override' : aiFeedback ? 'ai_feedback_submitted' : 'application_status_updated',
        beforeJson: {
          status: before.status,
          statusReason: before.statusReason,
          aiScore: before.aiScore,
          aiFeedback: before.aiFeedback,
          isAiOverridden: before.isAiOverridden,
        },
        afterJson: {
          status: updatedApp.status,
          statusReason: updatedApp.statusReason,
          aiScore: updatedApp.aiScore,
          aiFeedback: updatedApp.aiFeedback,
          isAiOverridden: updatedApp.isAiOverridden,
        },
        metadataJson: {
          jobId: id,
          advisoryOnly: true,
          manualDecisionRequired: true,
          aiFeedbackNote: aiFeedbackNote ? String(aiFeedbackNote) : null,
        },
      },
    })

    return NextResponse.json({ application: updatedApp }, { status: 200 })
  } catch (error) {
    console.error('Error updating application status:', error)
    return NextResponse.json({ error: 'Failed to update application status' }, { status: 500 })
  }
}
