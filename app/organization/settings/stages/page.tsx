"use client"

import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { DashboardLayout } from "@/components/layout"
import { PageHeader } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getStoredUser } from "@/lib/auth"
import { organizationActions } from "@/store/slices/organizationSlice"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function StagesSettingsPage() {
  const dispatch = useDispatch()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // New Stage form
  const [newStageName, setNewStageName] = useState("")

  // New Template form
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateSubject, setNewTemplateSubject] = useState("")
  const [newTemplateBody, setNewTemplateBody] = useState("")

  useEffect(() => {
    const user = getStoredUser()
    setCurrentUser(user)
    if (user?.organizationId) {
      loadData(user.organizationId)
    }
  }, [])

  const loadData = (orgId: string) => {
    setLoading(true)
    dispatch(organizationActions.fetchStagesRequest({
      organizationId: orgId,
      resolve: (data: any) => {
        if (data.stages) setStages(data.stages)
      }
    }))
    dispatch(organizationActions.fetchEmailTemplatesRequest({
      organizationId: orgId,
      resolve: (data: any) => {
        if (data.templates) setTemplates(data.templates)
        setLoading(false)
      },
      reject: () => { setLoading(false); toast.error('Failed to load data') }
    }))
  }

  const handleAddStage = () => {
    if (!newStageName.trim() || !currentUser?.organizationId) return
    setIsSaving(true)
    dispatch(organizationActions.createStageRequest({
      payload: { organizationId: currentUser.organizationId, name: newStageName },
      resolve: () => {
        setNewStageName('')
        toast.success('Stage added')
        loadData(currentUser.organizationId)
        setIsSaving(false)
      },
      reject: (err: string) => { toast.error(err || 'Error'); setIsSaving(false) }
    }))
  }

  const handleDeleteStage = (id: string) => {
    if (!currentUser?.organizationId) return
    if (!confirm('Are you sure you want to delete this stage?')) return
    dispatch(organizationActions.deleteStageRequest({
      id,
      organizationId: currentUser.organizationId,
      resolve: () => { toast.success('Stage deleted'); loadData(currentUser.organizationId) },
      reject: (err: string) => toast.error(err || 'Failed to delete')
    }))
  }

  const handleUpdateStageTemplate = (stageId: string, templateId: string) => {
    if (!currentUser?.organizationId) return
    const updatedStages = stages.map(s => s.id === stageId ? { ...s, emailTemplateId: templateId === 'none' ? null : templateId } : s)
    setStages(updatedStages)
    dispatch(organizationActions.createStageRequest({
      payload: { organizationId: currentUser.organizationId, stages: updatedStages },
      resolve: () => toast.success('Stage updated'),
      reject: () => toast.error('Failed to update stage')
    }))
  }

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateSubject.trim() || !newTemplateBody.trim() || !currentUser?.organizationId) return
    setIsSaving(true)
    dispatch(organizationActions.createEmailTemplateRequest({
      payload: {
        organizationId: currentUser.organizationId,
        name: newTemplateName,
        subject: newTemplateSubject,
        body: newTemplateBody
      },
      resolve: () => {
        setNewTemplateName('')
        setNewTemplateSubject('')
        setNewTemplateBody('')
        toast.success('Template added')
        loadData(currentUser.organizationId)
        setIsSaving(false)
      },
      reject: (err: string) => { toast.error(err || 'Error'); setIsSaving(false) }
    }))
  }

  const handleDeleteTemplate = (id: string) => {
    if (!currentUser?.organizationId) return
    if (!confirm('Are you sure you want to delete this template?')) return
    // Reuse updateEmailTemplateRequest with DELETE method via deleteStageRequest pattern
    dispatch(organizationActions.updateEmailTemplateRequest({
      id,
      payload: { organizationId: currentUser.organizationId, _method: 'DELETE' },
      resolve: () => { toast.success('Template deleted'); loadData(currentUser.organizationId) },
      reject: (err: string) => toast.error(err || 'Failed to delete template')
    }))
  }

  if (loading) return <DashboardLayout><p className="p-8">Loading settings...</p></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <PageHeader title="Pipeline & Emails" description="Configure your Kanban stages and automated transition emails" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stages Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Kanban Stages</CardTitle>
              <CardDescription>Manage the stages in your recruitment pipeline. System stages cannot be deleted but can be assigned emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {stages.map((stage, i) => (
                  <div key={stage.id} className="flex flex-col gap-3 p-3 bg-muted/40 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stage.name}</span>
                        {stage.systemId && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                      </div>
                      {!stage.systemId && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStage(stage.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">Automated Email Template</Label>
                      <Select 
                        value={stage.emailTemplateId || 'none'} 
                        onValueChange={(val) => handleUpdateStageTemplate(stage.id, val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- No automated email --</SelectItem>
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t flex gap-2">
                <Input 
                  placeholder="New stage name" 
                  value={newStageName} 
                  onChange={e => setNewStageName(e.target.value)} 
                />
                <Button onClick={handleAddStage} disabled={isSaving || !newStageName.trim()}>Add</Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Templates Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Create email templates that can be triggered when a candidate moves to a specific stage. Available variables: {'{{CandidateName}}'}, {'{{JobTitle}}'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-4 border border-dashed rounded-md">No templates created yet.</p>
                ) : (
                  templates.map(t => (
                    <div key={t.id} className="p-3 bg-muted/40 border rounded-md relative group">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => handleDeleteTemplate(t.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <h4 className="font-medium text-sm mb-1">{t.name}</h4>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Subject: {t.subject}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 bg-background p-2 rounded border">{t.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t space-y-3 bg-muted/20 p-4 rounded-md border mt-4">
                <h4 className="font-medium text-sm">Create New Template</h4>
                <div>
                  <Label className="text-xs">Template Name</Label>
                  <Input className="h-8 mt-1" placeholder="e.g. Reject Email" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input className="h-8 mt-1" placeholder="e.g. Update regarding your application" value={newTemplateSubject} onChange={e => setNewTemplateSubject(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Body Text</Label>
                  <Textarea className="mt-1 text-sm min-h-[100px]" placeholder="Hi {{CandidateName}},\n\nThanks for applying to {{JobTitle}}..." value={newTemplateBody} onChange={e => setNewTemplateBody(e.target.value)} />
                </div>
                <Button onClick={handleAddTemplate} disabled={isSaving || !newTemplateName || !newTemplateSubject || !newTemplateBody} className="w-full">
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
