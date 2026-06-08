'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/apiClient'
import { Sparkles, Loader2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'

interface GeneratedQuestion {
  text: string
  type: string
  options?: string[]
  answer: string
  testCases?: { input: string; expectedOutput: string; isHidden: boolean }[]
  selected?: boolean
}

export function AIGenerateModal({
  isOpen,
  onClose,
  organizationId,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  onSaved: () => void
}) {
  const [step, setStep] = useState<'config' | 'review'>('config')
  const [skill, setSkill] = useState('')
  const [difficulty, setDifficulty] = useState('3')
  const [questionType, setQuestionType] = useState('MCQ')
  const [count, setCount] = useState('3')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const handleGenerate = async () => {
    if (!skill.trim()) {
      toast.error('Please enter a skill or topic.')
      return
    }
    setIsGenerating(true)
    try {
      const data = await fetchJson(`/api/library-questions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, skill, difficulty, questionType, count: parseInt(count) }),
      })
      const qs: GeneratedQuestion[] = (data.questions || []).map((q: GeneratedQuestion) => ({ ...q, selected: true }))
      setQuestions(qs)
      setStep('review')
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate questions')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveSelected = async () => {
    const selected = questions.filter(q => q.selected)
    if (selected.length === 0) {
      toast.error('Please select at least one question to save.')
      return
    }
    setIsSaving(true)
    try {
      await Promise.all(
        selected.map(q =>
          fetchJson(`/api/library-questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId,
              text: q.text,
              answer: q.answer,
              options: q.options || null,
              questionType: q.type,
              skills: [skill],
              difficulty: parseInt(difficulty),
              testCases: q.testCases || null,
            }),
          })
        )
      )
      toast.success(`${selected.length} question(s) saved to library!`)
      onSaved()
      handleClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save questions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setStep('config')
    setSkill('')
    setDifficulty('3')
    setQuestionType('MCQ')
    setCount('3')
    setQuestions([])
    setExpanded({})
    onClose()
  }

  const toggleSelect = (idx: number) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, selected: !q.selected } : q))
  }

  const toggleExpand = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            {step === 'config'
              ? 'Configure the parameters and let AI generate candidate questions for your library.'
              : 'Review the generated questions. Select which ones to save.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'config' ? (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Skill / Topic <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. React Hooks, SQL Joins, System Design"
                value={skill}
                onChange={e => setSkill(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">Multiple Choice</SelectItem>
                    <SelectItem value="SA">Short Answer</SelectItem>
                    <SelectItem value="CODE">Coding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(v => (
                      <SelectItem key={v} value={String(v)}>Level {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>No. of Questions</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3,4,5].map(v => (
                      <SelectItem key={v} value={String(v)}>{v} Questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {questions.filter(q => q.selected).length} of {questions.length} selected
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep('config')}>
                ← Change Parameters
              </Button>
            </div>
            {questions.map((q, idx) => (
              <div
                key={idx}
                className={`border rounded-lg transition-all ${q.selected ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20'}`}
              >
                <div className="flex items-start gap-3 p-3">
                  <Checkbox
                    checked={q.selected}
                    onCheckedChange={() => toggleSelect(idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{q.type}</Badge>
                      {q.selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <p className="text-sm font-medium line-clamp-2" dangerouslySetInnerHTML={{ __html: q.text }} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleExpand(idx)}>
                    {expanded[idx] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                {expanded[idx] && (
                  <div className="px-4 pb-3 pt-0 border-t text-sm space-y-2">
                    {q.options && q.options.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">OPTIONS</p>
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`py-1 px-2 rounded text-xs ${opt === q.answer ? 'bg-green-100 text-green-800 font-semibold' : ''}`}>
                            {opt === q.answer ? '✓ ' : ''}{opt}
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">ANSWER / SOLUTION</p>
                      <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap overflow-x-auto">{q.answer}</pre>
                    </div>
                    {q.testCases && q.testCases.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">TEST CASES ({q.testCases.length})</p>
                        {q.testCases.map((tc, ti) => (
                          <div key={ti} className="text-xs border rounded p-2 mb-1">
                            <span className="font-medium">Input:</span> {tc.input} → <span className="font-medium">Output:</span> {tc.expectedOutput}
                            {tc.isHidden && <Badge variant="outline" className="ml-2 text-xs">Hidden</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step === 'config' ? (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Questions</>
              )}
            </Button>
          ) : (
            <Button onClick={handleSaveSelected} disabled={isSaving || questions.filter(q => q.selected).length === 0}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                `Save ${questions.filter(q => q.selected).length} Question(s) to Library`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
