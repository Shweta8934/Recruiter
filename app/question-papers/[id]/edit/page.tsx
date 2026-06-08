import { notFound } from 'next/navigation'
import { prisma } from '@/lib/server/prisma'
import { QuestionPaperWizard } from '@/components/question-papers/QuestionPaperWizard'

export default async function EditQuestionPaperPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const paper = await prisma.questionPaper.findUnique({
    where: { id },
    include: {
      sections: {
        include: { questions: true }
      }
    }
  });

  if (!paper) {
    notFound();
  }

  return <QuestionPaperWizard mode="edit" paperId={id} initialData={paper} />
}
