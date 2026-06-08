import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/server/prisma'
import { TestEnvironment } from '@/components/question-papers/TestEnvironment'
import { ThemeProviderClient } from '@/components/theme-provider-client'

export default async function TestPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attemptId?: string }>
}) {
  const { id } = await props.params
  const { attemptId } = await props.searchParams

  if (!attemptId) {
    redirect(`/question-papers/take/${id}`)
  }

  const paper = await prisma.questionPaper.findUnique({
    where: { id },
    include: {
      sections: {
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { order: 'asc' }
      },
      organization: {
        select: { name: true, logo: true, primaryColor: true, settings: true }
      }
    }
  })

  if (!paper || !paper.isActive) {
    notFound()
  }

  const attempt = await prisma.candidateTestAttempt.findUnique({
    where: { id: attemptId },
    include: { questionPaper: true }
  })

  if (!attempt || attempt.questionPaperId !== id) {
    redirect(`/question-papers/take/${id}`)
  }

  if (attempt.isCompleted) {
    redirect(`/question-papers/take/${id}/completed`)
  }

  return (
    <ThemeProviderClient hexColor={paper.organization?.primaryColor}>
      <TestEnvironment 
        paper={paper} 
        attempt={attempt} 
      />
    </ThemeProviderClient>
  )
}
