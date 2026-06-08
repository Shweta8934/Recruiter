'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { superAdminActions } from '@/store/slices/superAdminSlice'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { RootState } from '@/store/rootReducer'
import { PageHeader } from '@/components/common/PageHeader'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Download, Upload, ClipboardList, Code, Database, FileText, Users, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface Template {
  id: string
  title: string
  category: string | null
  totalQuestions: number
}

export default function TestTemplates() {
  const router = useRouter()
  const { user } = useAuth()
  const dispatch = useDispatch()
  const { templates: globalTemplates, isLoading: isLoadingLibrary } = useSelector((state: RootState) => state.superAdmin)
  const isUploading = useSelector((state: RootState) => state.questionPapers.isUploading)
  
  const [isCloning, setIsCloning] = useState<string | null>(null)
  
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<string>('general')

  useEffect(() => {
    dispatch(superAdminActions.fetchTemplatesRequest({}))
  }, [dispatch])

  const handleCloneTemplate = (templateId: string) => {
    if (!user) return
    setIsCloning(templateId)
    dispatch(questionPapersActions.cloneTemplateRequest({
      templateId,
      payload: { organizationId: user.organizationId, createdById: user.id },
      resolve: () => {
        toast.success('Template cloned successfully!')
        router.push('/question-papers')
        setIsCloning(null)
      },
      reject: () => {
        toast.error('Failed to clone template')
        setIsCloning(null)
      }
    }))
  }

  const handleDownloadTemplate = (type: string) => {
    window.open(`/api/test-templates/excel/download?type=${type}`, '_blank')
  }

  const handleUpload = () => {
    if (!uploadFile || !user?.organizationId) return
    
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('type', uploadType)
    formData.append('organizationId', user.organizationId)
    formData.append('createdById', user.id)

    dispatch(questionPapersActions.uploadExcelRequest({
      payload: formData,
      resolve: (data) => {
        toast.success(data.message || 'File uploaded successfully')
        setUploadFile(null)
        if (uploadType !== 'candidate') {
          router.push('/question-papers')
        }
      },
      reject: (errData) => {
        if (errData instanceof Blob) {
          const url = window.URL.createObjectURL(errData)
          const a = document.createElement('a')
          a.href = url
          a.download = 'error_report.xlsx'
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          toast.error('Validation failed. Please check the downloaded error report.')
        } else {
          toast.error(errData || 'Failed to upload')
        }
      }
    }))
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Test Templates"
          description="Browse global templates or upload tests/candidates in bulk using Excel."
        />

        <Tabs defaultValue="library" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="library">Global Test Library</TabsTrigger>
            <TabsTrigger value="bulk-upload">Excel Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            {isLoadingLibrary ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : globalTemplates.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-card">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium text-muted-foreground">Library is empty</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalTemplates.map(template => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        {template.category && <Badge variant="secondary">{template.category}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-muted-foreground mb-4">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        {template.totalQuestions} Questions
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        onClick={() => handleCloneTemplate(template.id)}
                        disabled={isCloning === template.id}
                      >
                        {isCloning === template.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bulk-upload">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Step 1: Download */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 1: Download Template</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { type: 'general', title: 'General Questions', icon: <FileText className="w-5 h-5"/> },
                    { type: 'coding', title: 'Coding Questions', icon: <Code className="w-5 h-5"/> },
                    { type: 'db', title: 'Database Queries', icon: <Database className="w-5 h-5"/> },
                    { type: 'upload', title: 'File Upload Questions', icon: <Upload className="w-5 h-5"/> },
                    { type: 'candidate', title: 'Candidate Bank', icon: <Users className="w-5 h-5"/> },
                  ].map(t => (
                    <Card key={t.type} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleDownloadTemplate(t.type)}>
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                          {t.icon}
                        </div>
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">Download .xlsx</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Step 2: Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 2: Upload Filled Template</h3>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Template Type</label>
                      <select 
                        className="w-full p-2 border rounded-md bg-background"
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                      >
                        <option value="general">General Questions</option>
                        <option value="coding">Coding Questions</option>
                        <option value="db">Database Queries</option>
                        <option value="upload">File Upload Questions</option>
                        <option value="candidate">Candidate Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Excel File (.xlsx)</label>
                      <input 
                        type="file" 
                        accept=".xlsx"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full p-2 border rounded-md bg-background file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      disabled={!uploadFile || isUploading}
                      onClick={handleUpload}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload and Validate
                    </Button>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
