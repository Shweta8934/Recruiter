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

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json()
    const { 
      organizationId, title, jobTitle, departmentName, 
      minExp, maxExp, duration, cutoffScore, skillsList, totalQuestions, sections, status, linkExpiresAt, proctorViolationThreshold, consentRequired, randomizeQuestions, randomizeOptions
    } = body

    if (!title || !jobTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existingPaper = await prisma.questionPaper.findUnique({
      where: { id }
    });

    if (!existingPaper) {
      return NextResponse.json({ error: 'Question paper not found' }, { status: 404 });
    }
    const access = await requireTenantAccess(existingPaper.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if ((status || existingPaper.status) === 'published') {
      const errors = validatePublishPayload(body)
      if (errors.length) {
        return NextResponse.json({ error: `Cannot publish: ${errors.join(', ')}` }, { status: 400 })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the Paper details
      const paper = await tx.questionPaper.update({
        where: { id },
        data: {
          title,
          jobTitle,
          departmentName: departmentName || 'Unassigned',
          minExp: parseInt(minExp) || 0,
          maxExp: parseInt(maxExp) || 0,
          duration: parseInt(duration) || 60,
          cutoffScore: parseInt(cutoffScore) || 70,
          skillsList: skillsList || '',
          totalQuestions: parseInt(totalQuestions) || 0,
          status: status || existingPaper.status,
          linkExpiresAt: linkExpiresAt ? new Date(linkExpiresAt) : (existingPaper.linkExpiresAt || defaultExpiryDateTime(null)),
          proctorViolationThreshold: parseInt(proctorViolationThreshold) || existingPaper.proctorViolationThreshold || 5,
          consentRequired: consentRequired !== undefined ? !!consentRequired : existingPaper.consentRequired,
          randomizeQuestions: randomizeQuestions !== undefined ? !!randomizeQuestions : existingPaper.randomizeQuestions,
          randomizeOptions: randomizeOptions !== undefined ? !!randomizeOptions : existingPaper.randomizeOptions,
        }
      });

      // 2. Delete existing Sections and Questions (Cascade will handle questions if set up, but let's be safe)
      await tx.paperSection.deleteMany({
        where: { questionPaperId: id }
      });

      // 3. Re-create Sections and Questions
      for (let sIndex = 0; sIndex < sections.length; sIndex++) {
        const section = sections[sIndex];
        const createdSection = await tx.paperSection.create({
          data: {
            questionPaperId: id,
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
            options: q.options ? JSON.stringify(q.options) : null,
            testCases: q.testCases ? JSON.stringify(q.testCases) : null,
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

    return NextResponse.json({ questionPaper: result }, { status: 200 })
  } catch (error) {
    console.error('Failed to update question paper:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const existingPaper = await prisma.questionPaper.findUnique({
      where: { id }
    });

    if (!existingPaper) {
      return NextResponse.json({ error: 'Question paper not found' }, { status: 404 });
    }
    const access = await requireTenantAccess(existingPaper.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (existingPaper.isPublicActive) {
      return NextResponse.json({ error: 'Cannot delete an activated question paper. Please deactivate it first.' }, { status: 400 });
    }

    await prisma.questionPaper.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Question paper deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete question paper:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
