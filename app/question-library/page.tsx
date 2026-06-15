'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { DashboardLayout } from '@/components/layout'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { questionLibraryActions } from '@/store/slices/questionLibrarySlice'
import type { RootState } from '@/store/rootReducer'
import { Plus, Sparkles, Search, Edit, Trash2, MoreVertical, BookOpen, Code2, FileQuestion, AlignLeft, SlidersHorizontal, RefreshCw } from 'lucide-react'

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Beginner', color: 'bg-green-100 text-green-800' },
  2: { label: 'Easy', color: 'bg-blue-100 text-blue-800' },
  3: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  4: { label: 'Hard', color: 'bg-orange-100 text-orange-800' },
  5: { label: 'Expert', color: 'bg-red-100 text-red-800' },
}

export default function QuestionLibraryPage() {
  const { user } = useAuth()
  const canManage = usePermission('question_papers', 'create')
  const canReview = user?.roleSlug === 'org-admin'
  const router = useRouter()
  const dispatch = useDispatch()
  const { items: questions, isLoading } = useSelector((s: RootState) => s.questionLibrary)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.organizationId) return
    dispatch(questionLibraryActions.fetchLibraryRequest({
      organizationId: user.organizationId,
      type: filterType === 'all' ? undefined : filterType,
      difficulty: filterDifficulty === 'all' ? undefined : filterDifficulty,
      status: filterStatus === 'all' ? undefined : filterStatus,
    }))
  }, [dispatch, user?.organizationId, filterType, filterDifficulty, filterStatus])

  const filteredQuestions = useMemo(() => questions.filter(q => q.text.toLowerCase().includes(search.toLowerCase()) || (q.skills || []).some((s: string) => s.toLowerCase().includes(search.toLowerCase()))), [questions, search])
  const stats = { total: questions.length, mcq: questions.filter(q => q.questionType === 'MCQ').length, sa: questions.filter(q => q.questionType === 'SA').length, code: questions.filter(q => q.questionType === 'CODE').length }

  const updateReviewStatus = (id: string, status: 'draft' | 'published', reason?: string) => {
    if (!user?.organizationId) return
    setReviewingId(id)
    dispatch(questionLibraryActions.updateReviewStatusRequest({
      id,
      organizationId: user.organizationId,
      status,
      reason,
      resolve: () => {
        setReviewingId(null)
        dispatch(questionLibraryActions.fetchLibraryRequest({
          organizationId: user.organizationId,
          type: filterType === 'all' ? undefined : filterType,
          difficulty: filterDifficulty === 'all' ? undefined : filterDifficulty,
          status: filterStatus === 'all' ? undefined : filterStatus,
        }))
      },
      reject: () => { setReviewingId(null) }
    }))
  }


  return (
    <DashboardLayout>
      <div className='space-y-6'>
        <PageHeader title='Question Library' description='A private bank of reusable questions. Add them to any test paper without affecting past assessments.'>
          {canManage && <><Button variant='outline' onClick={() => router.push(withBasePath('/question-library/ai'))}><Sparkles className='mr-2 h-4 w-4' /> Generate with AI</Button><Button onClick={() => router.push(withBasePath('/question-library/new'))}><Plus className='mr-2 h-4 w-4' /> Add Question</Button></>}
        </PageHeader>

        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          <div className='border rounded-xl p-4 bg-card shadow-sm'><p className='text-2xl font-bold'>{stats.total}</p><p className='text-xs text-muted-foreground'>Total Questions</p></div>
          <div className='border rounded-xl p-4 bg-card shadow-sm'><p className='text-2xl font-bold'>{stats.mcq}</p><p className='text-xs text-muted-foreground'>Multiple Choice</p></div>
          <div className='border rounded-xl p-4 bg-card shadow-sm'><p className='text-2xl font-bold'>{stats.sa}</p><p className='text-xs text-muted-foreground'>Short Answer</p></div>
          <div className='border rounded-xl p-4 bg-card shadow-sm'><p className='text-2xl font-bold'>{stats.code}</p><p className='text-xs text-muted-foreground'>Coding</p></div>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative flex-1 max-w-sm'><Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' /><Input placeholder='Search by question text or skill...' className='pl-9' value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className='flex items-center gap-2'><SlidersHorizontal className='h-4 w-4 text-muted-foreground' /><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className='w-36'><SelectValue /></SelectTrigger><SelectContent><SelectItem value='all'>All Types</SelectItem><SelectItem value='MCQ'>Multiple Choice</SelectItem><SelectItem value='SA'>Short Answer</SelectItem><SelectItem value='CODE'>Coding</SelectItem></SelectContent></Select><Select value={filterDifficulty} onValueChange={setFilterDifficulty}><SelectTrigger className='w-36'><SelectValue /></SelectTrigger><SelectContent><SelectItem value='all'>All Levels</SelectItem>{[1,2,3,4,5].map(v => <SelectItem key={v} value={String(v)}>Level {v}</SelectItem>)}</SelectContent></Select><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className='w-36'><SelectValue /></SelectTrigger><SelectContent><SelectItem value='all'>All Status</SelectItem><SelectItem value='draft'>Draft</SelectItem><SelectItem value='published'>Published</SelectItem></SelectContent></Select></div>
          <Button variant='ghost' size='icon' onClick={() => user?.organizationId && dispatch(questionLibraryActions.fetchLibraryRequest({ organizationId: user.organizationId }))}><RefreshCw className='h-4 w-4' /></Button>
        </div>

        <div className='border rounded-xl overflow-hidden bg-card shadow-sm'>
          <Table>
            <TableHeader><TableRow className='bg-muted/50'><TableHead className='w-[40%]'>Question</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Difficulty</TableHead><TableHead>Skills</TableHead><TableHead className='text-right'>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow> : filteredQuestions.map((q: any) => <TableRow key={q.id} className='cursor-pointer hover:bg-muted/40' onClick={() => router.push(`/question-library/${q.id}`)}><TableCell><p className='text-sm font-medium line-clamp-2 max-w-[380px]' dangerouslySetInnerHTML={{ __html: q.text }} /></TableCell><TableCell>{q.questionType}</TableCell><TableCell><Badge variant={q.status === 'published' ? 'default' : 'secondary'} className='capitalize'>{q.status || 'draft'}</Badge></TableCell><TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_LABELS[q.difficulty]?.color || DIFFICULTY_LABELS[3].color}`}>{DIFFICULTY_LABELS[q.difficulty]?.label || 'Medium'}</span></TableCell><TableCell><div className='flex flex-wrap gap-1'>{(q.skills || []).slice(0, 3).map((sk: string) => <Badge key={sk} variant='secondary' className='text-xs'>{sk}</Badge>)}</div></TableCell><TableCell className='text-right'>{canManage && <DropdownMenu><DropdownMenuTrigger asChild><Button variant='ghost' size='icon' className='h-8 w-8' onClick={(e)=>e.stopPropagation()}><MoreVertical className='h-4 w-4' /></Button></DropdownMenuTrigger><DropdownMenuContent align='end'><DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/question-library/${q.id}/edit`) }}><Edit className='mr-2 h-4 w-4' /> Edit</DropdownMenuItem>{canReview && q.status !== 'published' && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateReviewStatus(q.id, 'published', 'Approved from review queue') }} disabled={reviewingId === q.id}><span className='mr-2'>✓</span> Approve</DropdownMenuItem>}{canReview && q.status === 'published' && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateReviewStatus(q.id, 'draft', 'Moved back to draft from review queue') }} disabled={reviewingId === q.id}><span className='mr-2'>↩</span> Reject to Draft</DropdownMenuItem>}<DropdownMenuItem className='text-destructive focus:text-destructive' onClick={(e) => { e.stopPropagation(); setDeleteId(q.id) }}><Trash2 className='mr-2 h-4 w-4' /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Question</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove this question from the library?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (!deleteId || !user?.organizationId) return; dispatch(questionLibraryActions.deleteQuestionRequest({ id: deleteId, organizationId: user.organizationId, resolve: () => dispatch(questionLibraryActions.fetchLibraryRequest({ organizationId: user.organizationId })) })); setDeleteId(null) }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
