'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { superAdminActions } from '@/store/slices/superAdminSlice'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { RootState } from '@/store/rootReducer'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, Users, Search, ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

interface Template {
  id: string
  title: string
  category: string | null
  totalQuestions: number
  _count?: {
    templateUsages: number
  }
}

export default function SuperAdminTestTemplates() {
  const router = useRouter()
  const { user } = useAuth()
  
  const dispatch = useDispatch()
  const { templates, isLoading } = useSelector((state: RootState) => state.superAdmin)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const fetchTemplates = () => {
    dispatch(superAdminActions.fetchTemplatesRequest({}))
  }

  useEffect(() => {
    fetchTemplates()
  }, [dispatch])

  const handleDelete = () => {
    if (!deleteId) return
    dispatch(questionPapersActions.deleteQuestionPaperRequest({
      id: deleteId,
      resolve: () => {
        toast.success('Template deleted')
        setDeleteId(null)
        fetchTemplates()
      },
      reject: () => {
        toast.error('Failed to delete template')
        setDeleteId(null)
      }
    }))
  }

  const handleCreateNew = () => {
    if (!user) return
    setIsCreating(true)
    dispatch(superAdminActions.createTemplateRequest({
      payload: { createdById: user.id },
      resolve: (data) => {
        setIsCreating(false)
        toast.success('Blank template created. Redirecting to builder...')
        router.push(`/question-papers/${data.template.id}/edit`)
      },
      reject: () => {
        setIsCreating(false)
        toast.error('Failed to create template')
      }
    }))
  }

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Test Templates"
          description="Manage 'Gold Standard' pre-made templates available to all organizations."
        >
          <Button onClick={handleCreateNew} disabled={isCreating}>
            {isCreating ? <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <Plus className="mr-2 h-4 w-4" />}
            Create New Template
          </Button>
        </PageHeader>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or category..."
            className="pl-9 max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create a global template so client organizations can clone it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div key={template.id} className="border rounded-xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{template.title}</h3>
                    {template.category && (
                      <Badge variant="outline">{template.category}</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground my-4">
                    <div className="flex items-center gap-1" title="Total Questions">
                      <ClipboardList className="w-4 h-4" />
                      <span>{template.totalQuestions} Questions</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/question-papers/${template.id}/edit`)} className="h-8 w-8 text-muted-foreground">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteId(template.id)} 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {template._count?.templateUsages || 0} Orgs
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this global template? Organizations that have already cloned it will NOT lose their copies.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
}
