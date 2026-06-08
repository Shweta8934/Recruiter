import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params
    const body = await request.json()
    const { answers, codeLanguages, currentIdx, visited, marked, remainingSeconds, consentAccepted } = body

    const attempt = await prisma.candidateTestAttempt.findUnique({ where: { id: attemptId } })
    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    if (attempt.isCompleted) {
      return NextResponse.json({ error: 'Attempt already completed' }, { status: 400 })
    }

    const updated = await prisma.candidateTestAttempt.update({
      where: { id: attemptId },
      data: {
        responseDraftJson: {
          answers: answers || {},
          codeLanguages: codeLanguages || {},
          currentIdx: currentIdx ?? 0,
          visited: visited || [],
          marked: marked || [],
        },
        remainingSeconds: typeof remainingSeconds === 'number' ? remainingSeconds : attempt.remainingSeconds,
        lastAutosavedAt: new Date(),
        consentAcceptedAt: consentAccepted ? (attempt.consentAcceptedAt || new Date()) : attempt.consentAcceptedAt,
      }
    })

    return NextResponse.json({ success: true, lastAutosavedAt: updated.lastAutosavedAt })
  } catch (error) {
    console.error('Failed to autosave test attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
