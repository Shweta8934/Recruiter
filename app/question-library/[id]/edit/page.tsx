'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { DashboardLayout } from '@/components/layout'
import { useAuth } from '@/hooks/useAuth'
import { LibraryQuestionForm, type LibraryQuestionFormData } from '@/components/question-library/LibraryQuestionForm'
import { questionLibraryActions } from '@/store/slices/questionLibrarySlice'
import type { RootState } from '@/store/rootReducer'
import { ArrowLeft } from 'lucide-react'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'

export default function EditLibraryQuestionPage() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const dispatch = useDispatch()
  const { isLoading } = useSelector((s: RootState) => s.questionLibrary)
  const { departments } = useSelector((s: RootState) => s.questionPapers)
  const [initialData, setInitialData] = useState<LibraryQuestionFormData | null>(null)

  useEffect(() => {
    if (user?.organizationId) {
      dispatch(questionPapersActions.getDepartmentsRequest(user.organizationId))
    }
  }, [dispatch, user?.organizationId])

  useEffect(() => {
    if (!id || !user?.organizationId) return
    dispatch(questionLibraryActions.fetchQuestionRequest({
      id,
      organizationId: user.organizationId,
      resolve: (q: any) => setInitialData({
        id: q.id,
        text: q.text,
        questionType: q.questionType,
        options: q.options || ['', '', '', ''],
        answer: q.answer,
        skills: q.skills || [],
        difficulty: q.difficulty,
        departmentId: q.departmentId || null,
        status: q.status || 'draft',
        mcqMode: q.mcqMode || 'single',
        language: q.language || null,
        testCases: q.testCases || [],
      }),
    }))
  }, [dispatch, id, user?.organizationId])

  return (
    <DashboardLayout>
      <div className='space-y-6 max-w-5xl'>
        <button className='flex items-center gap-3 text-left' onClick={() => router.push('/question-library')}>
          <ArrowLeft className='h-4 w-4 text-muted-foreground' />
          <span>
            <span className='block text-3xl font-semibold leading-tight'>Edit Question</span>
            <span className='block text-muted-foreground'>Update library question.</span>
          </span>
        </button>
        <LibraryQuestionForm
          departments={departments || []}
          initialData={initialData}
          submitLabel={
            user?.roleSlug === 'org-admin' || user?.roleSlug === 'super-admin'
              ? ((initialData?.status || 'draft') === 'published' ? 'Update in Library' : 'Save to Library')
              : 'Save to Draft'
          }
          isSaving={isLoading}
          onSubmit={(data) => {
            if (!user?.organizationId) return
            dispatch(questionLibraryActions.saveQuestionRequest({ id, payload: { ...data, organizationId: user.organizationId }, resolve: () => router.push('/question-library') }))
          }}
        />
      </div>
    </DashboardLayout>
  )
}
