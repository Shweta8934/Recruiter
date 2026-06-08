import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params;
    const body = await request.json()
    const { violationType, description, mediaUrl } = body

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId },
      include: { questionPaper: true }
    })

    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.isCompleted) {
      return NextResponse.json({ error: 'Test already completed' }, { status: 400 })
    }

    let penalty = 0;
    if (violationType === 'TAB_SWITCH') penalty = 10;
    if (violationType === 'FULLSCREEN_EXIT') penalty = 15;
    if (violationType === 'IDENTITY_CHECK_FAIL') penalty = 20;
    if (violationType === 'AUDIO_NOISE_DETECTED') penalty = 20;
    if (violationType === 'SCREEN_SHARE_STOPPED') penalty = 20;
    // IDENTITY_CHECK (initial validation) has a penalty of 0, so we just log it.

    const shouldIncrementViolationCount = penalty > 0
    const nextViolations = attempt.totalViolations + (shouldIncrementViolationCount ? 1 : 0)
    const threshold = attempt.questionPaper?.proctorViolationThreshold || 5
    const flagged = nextViolations > threshold

    await prisma.$transaction([
      prisma.testViolation.create({
        data: {
          attemptId: attempt.id,
          violationType,
          description,
          mediaUrl
        }
      }),
      prisma.candidateTestAttempt.update({
        where: { id: attempt.id },
        data: {
          totalViolations: { increment: shouldIncrementViolationCount ? 1 : 0 },
          proctoringScore: { decrement: penalty },
          isFlaggedForReview: flagged ? true : attempt.isFlaggedForReview,
        }
      })
    ])

    await logAudit({
      actorUserId: null,
      entityType: 'candidate_test_attempt',
      entityId: attempt.id,
      action: 'update',
      before: {
        totalViolations: attempt.totalViolations,
        proctoringScore: attempt.proctoringScore,
        isFlaggedForReview: attempt.isFlaggedForReview,
      },
      after: {
        totalViolations: attempt.totalViolations + (shouldIncrementViolationCount ? 1 : 0),
        proctoringScore: attempt.proctoringScore - penalty,
        isFlaggedForReview: flagged ? true : attempt.isFlaggedForReview,
      },
      metadata: {
        violationType,
        description,
        mediaUrl: mediaUrl || null,
        penalty,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to log violation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
