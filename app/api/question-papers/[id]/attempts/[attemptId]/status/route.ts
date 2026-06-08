import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params;

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        questionPaperId: true,
        mobileStreamActive: true,
        startTime: true,
        isCompleted: true
      }
    })

    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      attempt
    })

  } catch (error) {
    console.error('Failed to fetch attempt status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
