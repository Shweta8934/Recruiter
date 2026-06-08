import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/apiClient'
import Editor from '@monaco-editor/react'

interface Testcase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface LibraryQuestionForm {
  id?: string;
  text: string;
  questionType: string;
  options: string[];
  answer: string;
  skills: string[];
  difficulty: number;
  testCases?: Testcase[];
}

export function LibraryQuestionModal({ 
  isOpen, 
  onClose, 
  question, 
  organizationId,
  onSaved 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  question?: LibraryQuestionForm | null,
  organizationId: string,
  onSaved: () => void 
}) {
  const [formData, setFormData] = useState<LibraryQuestionForm>({
    text: '',
    questionType: 'MCQ',
    options: ['', '', '', ''],
    answer: '',
    skills: [],
    difficulty: 3,
    testCases: []
  })
  const [isSaving, setIsSaving] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  useEffect(() => {
    if (question) {
      setFormData(question)
      const idx = question.options.indexOf(question.answer)
      setSelectedIndex(idx)
    } else {
      setFormData({
        text: '',
        questionType: 'MCQ',
        options: ['', '', '', ''],
        answer: '',
        skills: [],
        difficulty: 3,
        testCases: []
      })
      setSelectedIndex(-1)
    }
  }, [question, isOpen])

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      if (!formData.skills.includes(skillInput.trim())) {
        setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] })
      }
      setSkillInput('')
    }
  }

  const removeSkill = (sk: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== sk) })
  }

  const handleSave = async () => {
    if (!formData.text || !formData.questionType) {
      toast.error('Question text is required.')
      return
    }
    
    if (formData.questionType === 'MCQ' && (!formData.answer || !formData.options.includes(formData.answer))) {
      toast.error('For MCQ, answer must be exactly one of the options.')
      return
    }

    setIsSaving(true)
    try {
      if (formData.id) {
        await fetchJson(`/api/library-questions/${formData.id}?organizationId=${organizationId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...formData, organizationId })
        })
        toast.success('Question updated successfully')
      } else {
        await fetchJson(`/api/library-questions?organizationId=${organizationId}`, {
          method: 'POST',
          body: JSON.stringify({ ...formData, organizationId })
        })
        toast.success('Question created successfully')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save question')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formData.id ? 'Edit Library Question' : 'Create Library Question'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select 
                value={formData.questionType} 
                onValueChange={(val) => setFormData({ ...formData, questionType: val })}
                disabled={!!formData.id} // Prevents changing type of existing question
              >
                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">Multiple Choice</SelectItem>
                  <SelectItem value="SA">Short Answer</SelectItem>
                  <SelectItem value="CODE">Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Difficulty (1-5)</Label>
              <Select 
                value={String(formData.difficulty)} 
                onValueChange={(val) => setFormData({ ...formData, difficulty: parseInt(val) })}
              >
                <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(v => <SelectItem key={v} value={String(v)}>Level {v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question Text</Label>
            <div className="h-40 border rounded overflow-hidden">
              <Editor
                height="100%"
                language="html"
                theme="light"
                value={formData.text}
                onChange={(v) => setFormData({ ...formData, text: v || '' })}
                options={{ minimap: { enabled: false }, wordWrap: 'on' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills (Press Enter to add)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills.map(sk => (
                <div key={sk} className="bg-secondary px-2 py-1 rounded text-xs flex items-center">
                  {sk} <span className="ml-2 cursor-pointer" onClick={() => removeSkill(sk)}>×</span>
                </div>
              ))}
            </div>
            <Input 
              placeholder="e.g. React, Python" 
              value={skillInput} 
              onChange={e => setSkillInput(e.target.value)} 
              onKeyDown={addSkill}
            />
          </div>

          {formData.questionType === 'MCQ' && (
            <div className="space-y-4 border p-4 rounded bg-muted/20">
              <Label>Options & Answer</Label>
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input 
                    placeholder={`Option ${idx + 1}`} 
                    value={opt} 
                    onChange={e => {
                      const newOps = [...formData.options]
                      newOps[idx] = e.target.value
                      setFormData(prev => {
                        const updated: any = { ...prev, options: newOps }
                        if (selectedIndex === idx) {
                          updated.answer = e.target.value
                        }
                        return updated
                      })
                    }} 
                  />
                  <input 
                    type="radio" 
                    name="answerGroup"
                    checked={selectedIndex === idx}
                    onChange={() => {
                      setSelectedIndex(idx)
                      setFormData(prev => ({ ...prev, answer: prev.options[idx] || '' }))
                    }}
                  /> Correct
                </div>
              ))}
            </div>
          )}

          {(formData.questionType === 'SA' || formData.questionType === 'CODE') && (
            <div className="space-y-2">
              <Label>{formData.questionType === 'SA' ? 'Expected Answer / Guidelines' : 'Reference Solution'}</Label>
              <div className="h-32 border rounded overflow-hidden">
                <Editor
                  height="100%"
                  language={formData.questionType === 'CODE' ? 'javascript' : 'text'}
                  theme="light"
                  value={formData.answer}
                  onChange={(v) => setFormData({ ...formData, answer: v || '' })}
                  options={{ minimap: { enabled: false }, wordWrap: 'on' }}
                />
              </div>
            </div>
          )}

          {formData.questionType === 'CODE' && (
            <div className="space-y-2 border p-4 rounded bg-muted/20">
              <div className="flex justify-between items-center mb-2">
                <Label>Test Cases</Label>
                <Button variant="outline" size="sm" onClick={() => {
                  setFormData({ ...formData, testCases: [...(formData.testCases || []), { input: '', expectedOutput: '', isHidden: false }] })
                }}>Add Test Case</Button>
              </div>
              {formData.testCases?.map((tc, idx) => (
                <div key={idx} className="flex gap-2 items-start mb-2 border-b pb-2">
                  <div className="flex-1 space-y-1">
                    <Input placeholder="Input (e.g. 1\n2)" value={tc.input} onChange={e => {
                      const newTc = [...(formData.testCases || [])];
                      newTc[idx].input = e.target.value;
                      setFormData({ ...formData, testCases: newTc });
                    }} />
                    <Input placeholder="Expected Output" value={tc.expectedOutput} onChange={e => {
                      const newTc = [...(formData.testCases || [])];
                      newTc[idx].expectedOutput = e.target.value;
                      setFormData({ ...formData, testCases: newTc });
                    }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" checked={tc.isHidden} onChange={e => {
                        const newTc = [...(formData.testCases || [])];
                        newTc[idx].isHidden = e.target.checked;
                        setFormData({ ...formData, testCases: newTc });
                      }} />
                      Hidden (Used only for grading)
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const newTc = [...(formData.testCases || [])];
                      newTc.splice(idx, 1);
                      setFormData({ ...formData, testCases: newTc });
                    }}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Question'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
