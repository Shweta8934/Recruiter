import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { logAudit } from '@/lib/server/audit'
import { z } from 'zod'

const ALLOWED_ROLES = ['org-admin', 'hr', 'recruiter', 'super-admin']

const overrideSchema = z.object({
  organizationId: z.string().min(1),
  newScore: z.number().min(0).max(100),
  reason: z.string().min(5, 'Please provide a reason with at least 5 characters'),
})

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params
    const body = await request.json()
    const parsed = overrideSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const { organizationId, newScore, reason } = parsed.data

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!access.user.roleSlug || !ALLOWED_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: Only org-admin, hr, or recruiter can override scores.' }, { status: 403 })
    }

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId },
      include: { questionPaper: true },
    })

    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.questionPaper.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Forbidden: Organization mismatch' }, { status: 403 })
    }

    if (!attempt.isEvaluated) {
      return NextResponse.json({ error: 'Cannot override score before evaluation is complete.' }, { status: 400 })
    }

    const previousScore = attempt.score

    const updated = await prisma.candidateTestAttempt.update({
      where: { id: attemptId },
      data: {
        score: newScore,
        isScoreOverridden: true,
        manualOverrideReason: reason,
        overriddenById: access.user.id,
      },
    })

    // Audit log — this is mandatory per requirements
    await logAudit({
      actorUserId: access.user.id,
      entityType: 'candidate_test_attempt',
      entityId: attemptId,
      action: 'update',
      before: { score: previousScore, isScoreOverridden: attempt.isScoreOverridden },
      after: { score: newScore, isScoreOverridden: true, manualOverrideReason: reason, overriddenById: access.user.id },
    })

    return NextResponse.json({ success: true, attempt: updated })
  } catch (error) {
    console.error('Failed to override score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
