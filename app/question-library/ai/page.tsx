'use client'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { DashboardLayout } from '@/components/layout'
import { useAuth } from '@/hooks/useAuth'
import { AIGeneratePageForm } from '@/components/question-library/AIGeneratePageForm'
import { questionLibraryActions } from '@/store/slices/questionLibrarySlice'
import type { RootState } from '@/store/rootReducer'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'

export default function AIGenerateLibraryQuestionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const dispatch = useDispatch()
  const { isLoading } = useSelector((s: RootState) => s.questionLibrary)
  const { departments } = useSelector((s: RootState) => s.questionPapers)

  useEffect(() => {
    if (user?.organizationId) {
      dispatch(questionPapersActions.getDepartmentsRequest(user.organizationId))
    }
  }, [dispatch, user?.organizationId])

  return (
    <DashboardLayout>
      <div className='space-y-6 max-w-5xl'>
        <button className='flex items-center gap-3 text-left' onClick={() => router.push('/question-library')}>
          <ArrowLeft className='h-4 w-4 text-muted-foreground' />
          <span>
            <span className='block text-3xl font-semibold leading-tight'>Generate with AI</span>
            <span className='block text-muted-foreground'>Generate and review library questions before saving.</span>
          </span>
        </button>

        <AIGeneratePageForm
          departments={departments || []}
          saveButtonLabel={user?.roleSlug === 'org-admin' || user?.roleSlug === 'super-admin' ? 'Save to Library' : 'Save to Draft'}
          isLoading={isLoading}
          onGenerate={({ skill, difficulty, questionType, language, count, setQuestions }) => {
            if (!user?.organizationId) return
            dispatch(questionLibraryActions.generateQuestionsRequest({
              payload: { organizationId: user.organizationId, skill, difficulty, questionType, language, count },
              resolve: (qs: any[]) => setQuestions(qs.map(q => ({ ...q, selected: true })))
            }))
          }}
          onSave={(qs, meta) => {
            if (!user?.organizationId) return
            let pending = qs.length
            qs.forEach((q: any) => dispatch(questionLibraryActions.saveQuestionRequest({
              payload: {
                organizationId: user.organizationId,
                text: q.text,
                answer: q.answer,
                options: q.options || null,
                questionType: q.type,
                skills: [meta.skill],
                difficulty: parseInt(meta.difficulty),
                language: q.language || (meta.questionType === 'CODE' ? meta.language : null),
                departmentId: meta.departmentId,
                status: meta.status,
                aiGenerated: true,
                mcqMode: meta.questionType === 'MCQ' ? meta.mcqMode : undefined,
                testCases: q.testCases || null,
              },
              resolve: () => {
                pending -= 1
                if (pending === 0) router.push('/question-library')
              }
            })))
          }}
        />
      </div>
    </DashboardLayout>
  )
}
