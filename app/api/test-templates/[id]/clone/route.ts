import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await props.params;
    const body = await request.json();
    const { organizationId, createdById } = body;

    if (!organizationId || !createdById) {
      return NextResponse.json({ error: 'Missing organizationId or createdById' }, { status: 400 });
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const template = await prisma.questionPaper.findUnique({
      where: { id: templateId, isTemplate: true },
      include: {
        sections: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the cloned Paper
      const clonedPaper = await tx.questionPaper.create({
        data: {
          organizationId,
          createdById,
          title: `${template.title} (Clone)`,
          jobTitle: template.jobTitle,
          departmentName: template.departmentName,
          minExp: template.minExp,
          maxExp: template.maxExp,
          duration: template.duration,
          cutoffScore: template.cutoffScore,
          skillsList: template.skillsList,
          totalQuestions: template.totalQuestions,
          isActive: true,
          isPublicActive: false,
          isTemplate: false,
          category: template.category
        }
      });

      // 2. Clone Sections and Questions
      for (const section of template.sections) {
        const clonedSection = await tx.paperSection.create({
          data: {
            questionPaperId: clonedPaper.id,
            title: section.title,
            order: section.order,
            weightage: section.weightage
          }
        });

        if (section.questions && section.questions.length > 0) {
          const questionsData = section.questions.map((q) => ({
            sectionId: clonedSection.id,
            text: q.text,
            answer: q.answer,
            options: q.options ? JSON.parse(JSON.stringify(q.options)) : null,
            order: q.order,
            questionType: q.questionType
          }));

          await tx.question.createMany({
            data: questionsData
          });
        }
      }

      // 3. Record Usage
      await tx.templateUsage.create({
        data: {
          templateId,
          organizationId
        }
      });

      return clonedPaper;
    });

    return NextResponse.json({ questionPaper: result }, { status: 201 });
  } catch (error) {
    console.error('Failed to clone template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
