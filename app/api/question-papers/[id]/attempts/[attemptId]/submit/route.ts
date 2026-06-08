import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { sendAssessmentSubmittedEmail } from '@/lib/server/email'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params;
    const body = await request.json()
    // answers: Record<questionId, userAnswer>
    // codeLanguages: Record<questionId, languageKey> — optional, for Judge0
    const { answers, codeLanguages = {} } = body

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        questionPaper: {
          include: {
            sections: {
              include: { questions: true }
            }
          }
        }
      }
    })

    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.isCompleted) {
      return NextResponse.json({ error: 'Test already submitted' }, { status: 400 })
    }

    let correctCount = 0;
    const responseInserts: any[] = [];

    // Process all questions
    for (const section of attempt.questionPaper.sections) {
      for (const question of section.questions) {
        const userAnswer = answers[question.id] || null;
        const codeLanguage = codeLanguages[question.id] || null;

        if (!userAnswer) {
          responseInserts.push({
            attemptId: attempt.id,
            questionId: question.id,
            userAnswer: null,
            codeLanguage: null,
            isCorrect: false,
            evaluationReason: 'Candidate did not provide an answer.',
          });
          continue;
        }

        if (question.questionType === 'MCQ') {
          // Instant scoring for MCQ
          const isMulti = typeof userAnswer === 'string' && userAnswer.includes('||')
          let isCorrect = false
          if (isMulti) {
            const ua = userAnswer.split('||').map((x: string) => x.trim().toLowerCase()).filter(Boolean).sort()
            const ca = (question.answer || '').split('||').map((x: string) => x.trim().toLowerCase()).filter(Boolean).sort()
            isCorrect = ua.length === ca.length && ua.every((v: string, i: number) => v === ca[i])
          } else {
            isCorrect = userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
          }
          if (isCorrect) correctCount++;
          responseInserts.push({
            attemptId: attempt.id,
            questionId: question.id,
            userAnswer,
            codeLanguage: null,
            isCorrect,
            evaluationReason: isCorrect ? 'Correct Option' : 'Incorrect Option',
          });
        } else {
          // SA and CODE: save as pending — /evaluate will handle them with Judge0 or AI
          responseInserts.push({
            attemptId: attempt.id,
            questionId: question.id,
            userAnswer,
            codeLanguage,  // saved for Judge0
            isCorrect: null,
            evaluationStatus: 'pending',
            passedTestCases: null,
            totalTestCases: null,
            languageValidated: false,
            evaluationMeta: null,
            evaluationReason: null,
          });
        }
      }
    }

    // Insert all responses
    await prisma.userResponse.createMany({ data: responseInserts });

    // Compute MCQ-only partial score — recalculated after /evaluate runs
    const totalQuestions = attempt.questionPaper.totalQuestions;
    const partialScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const hasPendingEvaluation = responseInserts.some(r => r.isCorrect === null);

    await prisma.candidateTestAttempt.update({
      where: { id: attempt.id },
      data: {
        isCompleted: true,
        score: partialScore,
        originalScore: partialScore,
        isEvaluated: !hasPendingEvaluation,
        evaluatedAt: hasPendingEvaluation ? null : new Date(),
      }
    });

    // Await evaluation so that it completes at submit time
    if (hasPendingEvaluation) {
      const evaluateUrl = new URL(`/api/question-papers/${id}/attempts/${attempt.id}/evaluate`, request.url).toString()
      try {
        await fetch(evaluateUrl, { method: 'POST', cache: 'no-store' })
      } catch (err) {
        console.error('Submit-time evaluation trigger failed:', err)
      }
    }

    // Non-blocking recruiter notification trigger
    try {
      const recipients = await prisma.organizationMembership.findMany({
        where: {
          organizationId: attempt.questionPaper.organizationId || undefined,
          status: 'active',
          role: { in: ['recruiter', 'hr', 'org-admin'] },
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const reportUrl = appUrl ? `${appUrl}/question-papers/${id}/attempts/${attempt.id}` : undefined

      await Promise.allSettled(
        recipients
          .filter((m) => !!m.user?.email)
          .map((m) =>
            sendAssessmentSubmittedEmail({
              toEmail: m.user.email,
              recruiterName: m.user.name,
              candidateName: attempt.candidateName || attempt.email,
              candidateEmail: attempt.email,
              paperTitle: attempt.questionPaper.title || 'Assessment',
              score: partialScore,
              pendingEvaluation: hasPendingEvaluation,
              reportUrl,
            })
          )
      )
    } catch (notifyError) {
      console.error('Recruiter submit notification failed:', notifyError)
    }

    return NextResponse.json({ success: true, score: partialScore, pendingEvaluation: hasPendingEvaluation })
  } catch (error) {
    console.error('Failed to submit test:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
