import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

function validatePublishPayload(body: any) {
  const errors: string[] = []
  const sections = Array.isArray(body?.sections) ? body.sections : []
  if (!body?.title?.trim()) errors.push('Title is required')
  if (!body?.jobTitle?.trim()) errors.push('Job title is required')
  if (sections.length === 0) errors.push('At least one section is required')
  const hasQuestions = sections.some((s: any) => Array.isArray(s?.questions) && s.questions.length > 0)
  if (!hasQuestions) errors.push('At least one question is required')
  const weightageSum = sections.reduce((acc: number, s: any) => acc + (parseInt(s?.weightage) || 0), 0)
  if (weightageSum !== 100) errors.push('Section weightage must total 100')
  return errors
}

function defaultExpiryDateTime(linkExpiresAt?: string | null) {
  if (linkExpiresAt) return new Date(linkExpiresAt)
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const questionPapers = await prisma.questionPaper.findMany({
      where: {
        organizationId,
        isActive: true
      },
      include: {
        sections: {
          include: {
            questions: true
          }
        },
        _count: {
          select: { testAttempts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ questionPapers })
  } catch (error) {
    console.error('Failed to fetch question papers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      organizationId, createdById, title, jobTitle, departmentName,
      minExp, maxExp, duration, cutoffScore, skillsList, totalQuestions, sections, status, linkExpiresAt, proctorViolationThreshold, consentRequired, randomizeQuestions, randomizeOptions
    } = body

    if (!organizationId || !createdById || !title || !jobTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (status === 'published') {
      const errors = validatePublishPayload(body)
      if (errors.length) {
        return NextResponse.json({ error: `Cannot publish: ${errors.join(', ')}` }, { status: 400 })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Paper
      const paper = await tx.questionPaper.create({
        data: {
          organizationId,
          createdById,
          title,
          jobTitle,
          departmentName: departmentName || 'Unassigned',
          minExp: parseInt(minExp) || 0,
          maxExp: parseInt(maxExp) || 0,
          duration: parseInt(duration) || 60,
          cutoffScore: parseInt(cutoffScore) || 70,
          skillsList: skillsList || '',
          totalQuestions: parseInt(totalQuestions) || 0,
          isActive: true,
          isPublicActive: false,
          status: status || 'draft',
          linkToken: `ql_${Math.random().toString(36).slice(2, 12)}`,
          linkExpiresAt: defaultExpiryDateTime(linkExpiresAt),
          proctorViolationThreshold: parseInt(proctorViolationThreshold) || 5,
          consentRequired: consentRequired !== undefined ? !!consentRequired : true,
          randomizeQuestions: !!randomizeQuestions,
          randomizeOptions: !!randomizeOptions,
        }
      });

      // 2. Create Sections and Questions
      for (let sIndex = 0; sIndex < sections.length; sIndex++) {
        const section = sections[sIndex];
        const createdSection = await tx.paperSection.create({
          data: {
            questionPaperId: paper.id,
            title: section.title,
            order: sIndex,
            weightage: parseInt(section.weightage) || 0
          }
        });

        if (section.questions && section.questions.length > 0) {

    const questionsData = section.questions.map((q: any, qIndex: number) => ({
      sectionId: createdSection.id,
      text: q.text,
      answer: q.answer || '',
      options: q.options || null,
      testCases: q.testCases || null,
      order: qIndex,
      questionType: q.type || q.questionType || 'MCQ'
    }));



    await tx.question.createMany({
      data: questionsData
    });
  }
      }

return paper;
    });

return NextResponse.json({ questionPaper: result }, { status: 201 })
  } catch (error) {
  console.error('Failed to save question paper:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
}
