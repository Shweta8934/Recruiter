'use client'

import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Testcase { input: string; expectedOutput: string; isHidden: boolean }
export interface LibraryQuestionFormData {
  id?: string
  text: string
  questionType: string
  options: string[]
  answer: string
  skills: string[]
  difficulty: number
  departmentId?: string | null
  status?: string
  mcqMode?: 'single' | 'multi'
  language?: string | null
  testCases?: Testcase[]
}

const EMPTY: LibraryQuestionFormData = { text: '', questionType: 'MCQ', options: ['', '', '', ''], answer: '', skills: [], difficulty: 3, departmentId: null, status: 'draft', mcqMode: 'single', language: null, testCases: [] }

export function LibraryQuestionForm({ initialData, isSaving, onSubmit, departments = [], submitLabel = 'Save Question' }: { initialData?: LibraryQuestionFormData | null; isSaving: boolean; onSubmit: (data: LibraryQuestionFormData) => void; departments?: { id: string; name: string }[]; submitLabel?: string }) {
  const [formData, setFormData] = useState<LibraryQuestionFormData>(EMPTY)
  const [skillInput, setSkillInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  useEffect(() => {
    const data = initialData || EMPTY
    setFormData(data)
    
    // Synchronize selectedIndices based on initialData
    if (data.questionType === 'MCQ' && data.answer) {
      const answers = data.answer.split('||').filter(Boolean)
      const indices: number[] = []
      answers.forEach(ans => {
        const idx = data.options.indexOf(ans)
        if (idx !== -1 && !indices.includes(idx)) {
          indices.push(idx)
        }
      })
      setSelectedIndices(indices)
    } else {
      setSelectedIndices([])
    }
  }, [initialData])

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      const next = skillInput.trim()
      if (!formData.skills.includes(next)) setFormData({ ...formData, skills: [...formData.skills, next] })
      setSkillInput('')
    }
  }

  const handleRadioSelect = (idx: number) => {
    setSelectedIndices([idx])
    setFormData(prev => ({ ...prev, answer: prev.options[idx] || '' }))
  }

  const handleCheckboxSelect = (idx: number) => {
    const nextIndices = selectedIndices.includes(idx)
      ? selectedIndices.filter(i => i !== idx)
      : [...selectedIndices, idx]
    setSelectedIndices(nextIndices)
    const nextAnswer = nextIndices.map(i => formData.options[i]).filter(Boolean).join('||')
    setFormData(prev => ({ ...prev, answer: nextAnswer }))
  }

  const handleOptionChange = (idx: number, val: string) => {
    const nextOptions = [...formData.options]
    nextOptions[idx] = val
    
    // If this option is currently selected, update the answer string
    let nextAnswer = formData.answer
    if (formData.questionType === 'MCQ') {
      nextAnswer = selectedIndices.map(i => nextOptions[i]).filter(Boolean).join('||')
    }
    setFormData(prev => ({ ...prev, options: nextOptions, answer: nextAnswer }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!formData.text.trim()) nextErrors.text = 'Question text is required.'
    if (!formData.skills.length) nextErrors.skills = 'Add at least one skill tag.'
    if (!formData.departmentId) nextErrors.departmentId = 'Please select a department.'
    if (!formData.difficulty || formData.difficulty < 1 || formData.difficulty > 5) nextErrors.difficulty = 'Difficulty must be between 1 and 5.'
    if (formData.questionType === 'MCQ') {
      const validOptions = formData.options.map(o => o.trim()).filter(Boolean)
      if (validOptions.length < 2) nextErrors.options = 'At least 2 options are required for MCQ.'
      if (formData.mcqMode === 'single' && selectedIndices.length === 0) nextErrors.answer = 'Select one correct answer.'
      if (formData.mcqMode === 'multi' && selectedIndices.length === 0) nextErrors.answer = 'Select one or more correct answers.'
    }
    if (formData.questionType === 'CODE' && !formData.language) nextErrors.language = 'Select coding language.'
    if ((formData.questionType === 'SA' || formData.questionType === 'CODE') && !formData.answer.trim()) nextErrors.answer = 'Answer is required.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  return <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Question Type</Label><Select value={formData.questionType} onValueChange={(val) => setFormData({ ...formData, questionType: val })} disabled={!!formData.id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MCQ">Multiple Choice</SelectItem><SelectItem value="SA">Short Answer</SelectItem><SelectItem value="CODE">Coding</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Difficulty</Label><Select value={String(formData.difficulty)} onValueChange={(val) => setFormData({ ...formData, difficulty: parseInt(val) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(v => <SelectItem key={v} value={String(v)}>Level {v}</SelectItem>)}</SelectContent></Select>{errors.difficulty && <p className="text-sm text-destructive">{errors.difficulty}</p>}</div>
    </div>
    {formData.questionType === 'MCQ' && (
      <div className="space-y-2">
        <Label>MCQ Mode</Label>
        <Select 
          value={formData.mcqMode || 'single'} 
          onValueChange={(val: 'single' | 'multi') => {
            setSelectedIndices([])
            setFormData({ ...formData, mcqMode: val, answer: '' })
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single Select</SelectItem>
            <SelectItem value="multi">Multi Select</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}
    {formData.questionType === 'CODE' && <div className="space-y-2"><Label>Coding Language</Label><Select value={formData.language || ''} onValueChange={(val) => setFormData({ ...formData, language: val })}><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger><SelectContent><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem><SelectItem value="go">Go</SelectItem><SelectItem value="cpp">C++</SelectItem></SelectContent></Select>{errors.language && <p className="text-sm text-destructive">{errors.language}</p>}</div>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Department</Label><Select value={formData.departmentId || 'none'} onValueChange={(val) => setFormData({ ...formData, departmentId: val === 'none' ? null : val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No Department</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>{errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId}</p>}</div>
      <div className="space-y-2"><Label>Status</Label><Select value={formData.status || 'draft'} onValueChange={(val) => setFormData({ ...formData, status: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select></div>
    </div>
    <div className="space-y-2"><Label>Question Text</Label><div className="h-44 border rounded-md overflow-hidden"><Editor height="100%" language="html" theme="light" value={formData.text} onChange={(v)=>setFormData({ ...formData, text: v || '' })} options={{ minimap:{enabled:false}, wordWrap:'on' }} /></div>{errors.text && <p className="text-sm text-destructive">{errors.text}</p>}</div>
    <div className="space-y-2"><Label>Skills (Enter to add)</Label><div className="flex flex-wrap gap-2 mb-2">{formData.skills.map(sk=><div key={sk} className="bg-secondary px-2 py-1 rounded text-xs">{sk} <button type="button" onClick={()=>setFormData({ ...formData, skills: formData.skills.filter(s=>s!==sk) })}>x</button></div>)}</div><Input value={skillInput} onChange={e=>setSkillInput(e.target.value)} onKeyDown={addSkill} />{errors.skills && <p className="text-sm text-destructive">{errors.skills}</p>}</div>
    {formData.questionType==='MCQ' && <div className="space-y-3 border p-4 rounded-md bg-muted/20"><Label>Options & Answer</Label>{formData.options.map((opt,idx)=><div key={idx} className="flex items-center gap-2"><Input placeholder={`Option ${idx + 1}`} value={opt} onChange={e=>handleOptionChange(idx, e.target.value)} />{formData.mcqMode === 'single' ? <input type="radio" name="answerGroup" checked={selectedIndices.includes(idx)} onChange={()=>handleRadioSelect(idx)} /> : <input type="checkbox" checked={selectedIndices.includes(idx)} onChange={()=>handleCheckboxSelect(idx)} />}</div>)}{errors.options && <p className="text-sm text-destructive">{errors.options}</p>}{errors.answer && <p className="text-sm text-destructive">{errors.answer}</p>}</div>}
    {(formData.questionType==='SA'||formData.questionType==='CODE') && <div className="space-y-2"><Label>{formData.questionType==='SA' ? 'Expected Answer / Guidelines' : 'Reference Solution'}</Label><div className="h-32 border rounded-md overflow-hidden"><Editor height="100%" language={formData.questionType==='CODE'?(formData.language || 'javascript'):'text'} theme="light" value={formData.answer} onChange={(v)=>setFormData({ ...formData, answer: v || '' })} options={{ minimap:{enabled:false}, wordWrap:'on' }} /></div>{errors.answer && <p className="text-sm text-destructive">{errors.answer}</p>}</div>}
    <div className="flex justify-end pt-2"><Button onClick={()=>{ if (validate()) onSubmit(formData) }} disabled={isSaving}>{isSaving ? 'Saving...' : submitLabel}</Button></div>
  </div>
}
