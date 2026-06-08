import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params;
    const body = await request.json()
    const { image } = body

    if (!image) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId }
    })

    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.isCompleted) {
      return NextResponse.json({ error: 'Test already completed' }, { status: 400 })
    }

    // Save the snapshot in TestViolation and ensure mobileStreamActive is set to true
    await prisma.$transaction([
      prisma.testViolation.create({
        data: {
          attemptId: attempt.id,
          violationType: 'MOBILE_FEED',
          description: '360° environmental room snapshot captured.',
          mediaUrl: image
        }
      }),
      ...(attempt.mobileStreamActive ? [] : [
        prisma.candidateTestAttempt.update({
          where: { id: attempt.id },
          data: { mobileStreamActive: true }
        })
      ])
    ])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to save mobile feed snapshot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
