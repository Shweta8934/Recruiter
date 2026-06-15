'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { PageHeader } from '@/components/common/PageHeader'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Plus, Search, Edit, Share2, Mail, Trash2, FileText, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ShareModal } from '@/components/question-papers/ShareModal'
import { InviteModal } from '@/components/question-papers/InviteModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Paper {
  id: string
  title: string
  jobTitle: string
  departmentName: string
  duration: number
  totalQuestions: number
  isActive: boolean
  isPublicActive: boolean
  status?: 'draft' | 'published'
  _count?: {
    testAttempts: number
  }
}

export default function QuestionPapersList() {
  const router = useRouter()
  const { user } = useAuth()
  const canCreate = usePermission('question_papers', 'create')
  const canUpdate = usePermission('question_papers', 'update')
  const canDelete = usePermission('question_papers', 'delete')
  const dispatch = useDispatch()

  const [papers, setPapers] = useState<Paper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchPapers = () => {
    if (!user?.organizationId) return
    setIsLoading(true)
    dispatch(questionPapersActions.fetchPapersRequest({
      organizationId: user.organizationId,
      resolve: (data) => {
        setPapers(data.questionPapers || [])
        setIsLoading(false)
      },
      reject: () => {
        toast.error('Failed to fetch question papers')
        setIsLoading(false)
      }
    }))
  }

  useEffect(() => {
    fetchPapers()
  }, [user?.organizationId, dispatch])

  const handleDelete = () => {
    if (!deleteId) return
    dispatch(questionPapersActions.deleteQuestionPaperRequest({
      id: deleteId,
      resolve: () => {
        toast.success('Question paper deactivated')
        setDeleteId(null)
        fetchPapers()
      },
      reject: () => {
        toast.error('Failed to deactivate question paper')
        setDeleteId(null)
      }
    }))
  }

  const openShare = (paper: Paper) => {
    setSelectedPaper(paper)
    setShareModalOpen(true)
  }

  const openInvite = (paper: Paper) => {
    setSelectedPaper(paper)
    setInviteModalOpen(true)
  }

  const filteredPapers = papers.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
        title="Question Papers"
        description="Manage assessment question papers and tests."
      >
        {canCreate && (
          <Button onClick={() => router.push(withBasePath('/question-papers/generate'))}>
            <Plus className="mr-2 h-4 w-4" />
            Generate New Paper
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or job role..."
          className="pl-9 max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20">
          <FileText className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No question papers found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {searchQuery ? "No results match your search." : "Create your first question paper to start assessing candidates."}
          </p>
          {canCreate && !searchQuery && (
            <Button onClick={() => router.push(withBasePath('/question-papers/generate'))} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Generate Paper
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map(paper => (
            <div key={paper.id} className="border rounded-xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 
                    className="font-semibold text-lg hover:text-primary cursor-pointer line-clamp-1"
                    onClick={() => router.push(`/question-papers/${paper.id}`)}
                  >
                    {paper.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={paper.status === 'published' ? 'default' : 'secondary'}>
                      {paper.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                    {paper.isPublicActive && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{paper.jobTitle} • {paper.departmentName}</p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1" title="Total Questions">
                    <FileText className="w-4 h-4" />
                    <span>{paper.totalQuestions}</span>
                  </div>
                  <div title="Duration">
                    <span>⏱ {paper.duration}m</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto font-medium text-foreground" title="Candidates Attempted">
                    👥 <span>{paper._count?.testAttempts || 0} Candidates</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-1">
                    {canUpdate && (
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/question-papers/${paper.id}/edit`)} className="h-8 w-8 text-muted-foreground">
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteId(paper.id)} 
                        disabled={paper.isPublicActive}
                        title={paper.isPublicActive ? "Cannot delete an active paper" : "Delete"}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openShare(paper)} className="h-8 text-xs" disabled={paper.status !== 'published'}>
                      <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                    </Button>
                    <Button size="sm" onClick={() => openInvite(paper)} className="h-8 text-xs" disabled={paper.status !== 'published'}>
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> Invite
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPaper && (
        <>
          <ShareModal 
            isOpen={shareModalOpen} 
            onClose={() => setShareModalOpen(false)} 
            paperId={selectedPaper.id}
            title={selectedPaper.title}
            initialIsPublic={selectedPaper.isPublicActive}
            onStatusChange={(status) => {
              setPapers(papers.map(p => p.id === selectedPaper.id ? { ...p, isPublicActive: status } : p))
            }}
          />
          <InviteModal 
            isOpen={inviteModalOpen} 
            onClose={() => setInviteModalOpen(false)} 
            paperId={selectedPaper.id}
            title={selectedPaper.title}
          />
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Question Paper</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this question paper? It will no longer be available for testing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
