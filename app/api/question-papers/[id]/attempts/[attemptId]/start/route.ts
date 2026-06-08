import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params;

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

    if (attempt.questionPaper.linkExpiresAt && new Date() > attempt.questionPaper.linkExpiresAt) {
      return NextResponse.json({ error: 'This assessment link has expired' }, { status: 403 })
    }

    // Only set startTime if it's not already set
    if (!attempt.startTime) {
      await prisma.candidateTestAttempt.update({
        where: { id: attemptId },
        data: { startTime: new Date() }
      })
    }

    const latest = await prisma.candidateTestAttempt.findUnique({ where: { id: attemptId } })

    return NextResponse.json({
      success: true,
      remainingSeconds: latest?.remainingSeconds ?? null,
      draft: latest?.responseDraftJson ?? null,
      consentRequired: attempt.questionPaper.consentRequired,
      consentAcceptedAt: latest?.consentAcceptedAt ?? null,
      proctorViolationThreshold: attempt.questionPaper.proctorViolationThreshold ?? 5,
    })
  } catch (error) {
    console.error('Failed to start test attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
