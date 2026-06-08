'use client'

import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { DashboardLayout } from '@/components/layout'
import { useAuth } from '@/hooks/useAuth'
import { LibraryQuestionForm } from '@/components/question-library/LibraryQuestionForm'
import { questionLibraryActions } from '@/store/slices/questionLibrarySlice'
import type { RootState } from '@/store/rootReducer'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'

export default function NewLibraryQuestionPage() {
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
            <span className='block text-3xl font-semibold leading-tight'>Add Question</span>
            <span className='block text-muted-foreground'>Create a new library question.</span>
          </span>
        </button>
        <LibraryQuestionForm
          departments={departments || []}
          submitLabel={user?.roleSlug === 'org-admin' || user?.roleSlug === 'super-admin' ? 'Save to Library' : 'Save to Draft'}
          isSaving={isLoading}
          onSubmit={(data) => {
            if (!user?.organizationId) return
            dispatch(questionLibraryActions.saveQuestionRequest({ payload: { ...data, organizationId: user.organizationId }, resolve: () => router.push('/question-library') }))
          }}
        />
      </div>
    </DashboardLayout>
  )
}
