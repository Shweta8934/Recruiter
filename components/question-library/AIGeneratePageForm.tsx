'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

export function AIGeneratePageForm({ onGenerate, onSave, isLoading, departments = [], saveButtonLabel = 'Save Selected' }: { onGenerate: (p:any)=>void; onSave:(qs:any[],meta:any)=>void; isLoading:boolean; departments?: { id: string; name: string }[]; saveButtonLabel?: string }) {
  const [skill, setSkill] = useState('')
  const [difficulty, setDifficulty] = useState('3')
  const [questionType, setQuestionType] = useState('MCQ')
  const [language, setLanguage] = useState('javascript')
  const [mcqMode, setMcqMode] = useState<'single' | 'multi'>('single')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [count, setCount] = useState('3')
  const [questions, setQuestions] = useState<any[]>([])

  return <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Skill</Label><Input value={skill} onChange={e=>setSkill(e.target.value)} placeholder="e.g. React, JavaScript" /></div>
      <div className="space-y-2"><Label>Question Type</Label><Select value={questionType} onValueChange={setQuestionType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MCQ">MCQ</SelectItem><SelectItem value="SA">Short Answer</SelectItem><SelectItem value="CODE">Coding</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Difficulty</Label><Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(v=><SelectItem key={v} value={String(v)}>Level {v}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Count</Label><Select value={count} onValueChange={setCount}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[3,4,5].map(v=><SelectItem key={v} value={String(v)}>{v}</SelectItem>)}</SelectContent></Select></div>
      {questionType === 'MCQ' && <div className="space-y-2"><Label>MCQ Mode</Label><Select value={mcqMode} onValueChange={(v: 'single' | 'multi') => setMcqMode(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Single Select</SelectItem><SelectItem value="multi">Multi Select</SelectItem></SelectContent></Select></div>}
      <div className="space-y-2"><Label>Department</Label><Select value={departmentId} onValueChange={setDepartmentId}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(v: 'draft' | 'published') => setStatus(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select></div>
      {questionType === 'CODE' && <div className="space-y-2 md:col-span-2"><Label>Coding Language</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem><SelectItem value="go">Go</SelectItem><SelectItem value="cpp">C++</SelectItem></SelectContent></Select></div>}
    </div>
    <div className="flex justify-end"><Button disabled={isLoading || !departmentId} onClick={()=>onGenerate({ skill, difficulty, questionType, language, count: parseInt(count), setQuestions })}>{isLoading?'Generating...':'Generate Questions'}</Button></div>
    {questions.map((q, i)=><div key={i} className="border p-3 rounded"><div className="flex gap-2"><Checkbox checked={q.selected ?? true} onCheckedChange={(v)=>setQuestions(prev=>prev.map((x,idx)=>idx===i?{...x, selected: !!v}:x))} /><Badge>{q.type}</Badge></div><p className="mt-2" dangerouslySetInnerHTML={{ __html: q.text }} /></div>)}
    {questions.length>0 && <Button onClick={()=>onSave(questions.filter(q=>q.selected ?? true), { skill, difficulty, questionType, language, mcqMode, departmentId, status })}>{saveButtonLabel}</Button>}
  </div>
}
