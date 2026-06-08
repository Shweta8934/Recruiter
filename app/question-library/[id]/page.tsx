'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { DashboardLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { questionLibraryActions } from '@/store/slices/questionLibrarySlice'
import { ArrowLeft } from 'lucide-react'

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const dispatch = useDispatch()
  const [q, setQ] = useState<any>(null)

  useEffect(() => {
    if (!id || !user?.organizationId) return
    dispatch(questionLibraryActions.fetchQuestionRequest({ id, organizationId: user.organizationId, resolve: (data: any) => setQ(data) }))
  }, [id, user?.organizationId, dispatch])

  return <DashboardLayout><div className='space-y-6 max-w-5xl'>
    <button className='flex items-center gap-3 text-left' onClick={() => router.push('/question-library')}>
      <ArrowLeft className='h-4 w-4 text-muted-foreground' />
      <span>
        <span className='block text-3xl font-semibold leading-tight'>Question Details</span>
        <span className='block text-muted-foreground'>View question details</span>
      </span>
    </button>
    {!q ? <div>Loading...</div> : <div className='rounded-xl border bg-card p-6 shadow-sm space-y-4'>
      <div className='flex flex-wrap gap-2'>
        <Badge>{q.questionType}</Badge>
        {q.mcqMode && q.questionType === 'MCQ' && <Badge variant='secondary'>{q.mcqMode === 'multi' ? 'Multi Select' : 'Single Select'}</Badge>}
        <Badge variant='secondary'>Level {q.difficulty}</Badge>
        {q.status && <Badge variant='outline' className='capitalize'>{q.status}</Badge>}
        {q.language && <Badge variant='outline'>{q.language}</Badge>}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
        <div><p className='text-muted-foreground'>Department</p><p>{q.department?.name || 'Unassigned'}</p></div>
        <div><p className='text-muted-foreground'>Created</p><p>{q.createdAt ? new Date(q.createdAt).toLocaleString() : '-'}</p></div>
      </div>
      <div><p className='text-sm text-muted-foreground mb-1'>Question</p><div dangerouslySetInnerHTML={{ __html: q.text }} /></div>
      {!!q.options?.length && <div><p className='text-sm text-muted-foreground mb-1'>Options</p>{q.options.map((o: string, i: number) => <div key={i}>{o}</div>)}</div>}
      <div><p className='text-sm text-muted-foreground mb-1'>Answer</p><pre className='whitespace-pre-wrap text-sm'>{q.mcqMode === 'multi' ? (q.answer || '').split('||').filter(Boolean).join(', ') : q.answer}</pre></div>
      {!!q.skills?.length && <div><p className='text-sm text-muted-foreground mb-1'>Skills</p><div className='flex flex-wrap gap-1'>{q.skills.map((sk: string) => <Badge key={sk} variant='secondary'>{sk}</Badge>)}</div></div>}
      <div className='flex justify-end'><Button onClick={() => router.push(`/question-library/${q.id}/edit`)}>Edit</Button></div>
    </div>}
  </div></DashboardLayout>
}
