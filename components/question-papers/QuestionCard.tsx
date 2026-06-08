'use client'

import { useState, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RichTextToolbar } from './RichTextToolbar'
import { Copy, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

export interface QuestionData {
  id?: string
  text: string
  codeSnippet?: string
  type: 'MCQ' | 'SA' | 'CODE'
  options: any
  answer: string
  required?: boolean
  mcqMode?: 'single' | 'multi'
  testCases?: { input: string; expectedOutput: string; isHidden: boolean }[]
}

interface QuestionCardProps {
  question: QuestionData
  index: number
  onChange: (q: QuestionData) => void
  onDelete: () => void
  onCopy: () => void
}

const AVAILABLE_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'go', label: 'Go' },
  { id: 'typescript', label: 'TypeScript' }
]

export function QuestionCard({ question, index, onChange, onDelete, onCopy }: QuestionCardProps) {
  const [showCodeSnippet, setShowCodeSnippet] = useState(!!question.codeSnippet)
  const [isFocused, setIsFocused] = useState(false)
  const [starterCodeLang, setStarterCodeLang] = useState('javascript')
  const textRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  
  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleChange = (updates: Partial<QuestionData>) => {
    onChange({
      ...question,
      text: textRef.current?.innerHTML || question.text,
      ...updates
    })
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (textRef.current) {
      handleChange({ text: textRef.current.innerHTML })
    }
  }

  const handleFormat = (command: string, value?: string) => {
    if (command === 'insertImage' && value) {
      if (textRef.current) {
        textRef.current.innerHTML += `<br><img src="${value}" alt="Uploaded image" class="max-w-full h-auto rounded-md my-2" /><br>`
        handleChange({ text: textRef.current.innerHTML })
      }
      return
    }
    
    document.execCommand(command, false, value)
    if (textRef.current) {
      textRef.current.focus()
    }
  }

  const handleImageUpload = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      dispatch(questionPapersActions.uploadImageRequest({
        file,
        resolve,
        reject: () => resolve(null) // Return null on failure as the original code did
      }))
    })
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'MCQ': return 'bg-blue-100 text-blue-800'
      case 'SA': return 'bg-primary/10 text-primary'
      case 'CODE': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const updateOption = (optIndex: number, val: string) => {
    if (!Array.isArray(question.options)) return
    const newOptions = [...question.options]
    const oldVal = newOptions[optIndex]
    newOptions[optIndex] = val
    
    const updates: Partial<QuestionData> = { options: newOptions }
    if (question.answer === oldVal && oldVal !== '') {
      updates.answer = val
    }
    handleChange(updates)
  }

  return (
    <div 
      className="border rounded-lg bg-card shadow-sm p-5 relative mb-4 transition-all focus-within:ring-2 focus-within:ring-primary/20"
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={-1}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-2 py-0.5 rounded-full border-muted-foreground/30">
            Q{index + 1}
          </Badge>
          <Badge className={`px-2 py-0.5 shadow-none border-0 ${getTypeColor(question.type)}`} variant="outline">
            {question.type}
          </Badge>
        </div>

        <div className="flex items-center gap-2 opacity-0 focus-within:opacity-100 transition-opacity" style={{ opacity: isFocused ? 1 : 0 }}>
          <RichTextToolbar 
            onFormat={handleFormat} 
            onImageUpload={handleImageUpload} 
            onToggleCodeSnippet={() => setShowCodeSnippet(!showCodeSnippet)}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div 
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[40px] text-base p-2 outline-none border border-transparent focus:border-input rounded-md transition-colors empty:before:content-['Enter_question_text...'] empty:before:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: question.text }}
        />

        {showCodeSnippet && (
          <div className="space-y-2 mt-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Code Snippet (Optional)</Label>
            <Textarea 
              value={question.codeSnippet || ''}
              onChange={(e) => handleChange({ codeSnippet: e.target.value })}
              placeholder="Paste any code snippet related to the question here..."
              className="font-mono text-sm bg-muted/30 resize-y min-h-[100px]"
            />
          </div>
        )}

        {question.type === 'MCQ' && Array.isArray(question.options) && (
          <div className="space-y-3 pl-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">MCQ Mode</Label>
              <select className="text-xs border rounded px-2 py-1" value={question.mcqMode || 'single'} onChange={(e) => handleChange({ mcqMode: e.target.value as 'single' | 'multi', answer: '' })}>
                <option value="single">Single Select</option>
                <option value="multi">Multi Select</option>
              </select>
            </div>
            {(question.mcqMode || 'single') === 'single' ? (
              <RadioGroup
                value={question.options.indexOf(question.answer) !== -1 ? question.options.indexOf(question.answer).toString() : undefined}
                onValueChange={(val) => handleChange({ answer: question.options[parseInt(val)] })}
                className="space-y-3"
              >
                {question.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-3">
                    <RadioGroupItem value={oIndex.toString()} id={`q${index}-opt${oIndex}`} />
                    <Input value={opt} onChange={(e) => updateOption(oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="flex-1" />
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                {question.options.map((opt, oIndex) => {
                  const selected = (question.answer || '').split('||').filter(Boolean)
                  return (
                    <div key={oIndex} className="flex items-center gap-3">
                      <Checkbox
                        checked={selected.includes(opt)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected)
                          if (v) next.add(opt); else next.delete(opt)
                          handleChange({ answer: Array.from(next).join('||') })
                        }}
                      />
                      <Input value={opt} onChange={(e) => updateOption(oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="flex-1" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {question.type === 'SA' && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Sample Answer</Label>
            <Textarea 
              value={question.answer}
              onChange={(e) => handleChange({ answer: e.target.value })}
              placeholder="Provide a sample or expected answer..."
              className="resize-y"
            />
          </div>
        )}

        {question.type === 'CODE' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Expected Code Solution</Label>
              <Textarea 
                value={question.answer}
                onChange={(e) => handleChange({ answer: e.target.value })}
                placeholder="Provide the expected code solution (hidden from candidate)..."
                className="font-mono text-sm bg-muted/50 resize-y min-h-[100px]"
              />
            </div>
            
            {/* IDE Configuration Panel */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-5">
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                IDE Configuration
              </h4>
              
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Allowed Languages</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AVAILABLE_LANGUAGES.map(lang => {
                    const isChecked = question.options?.allowedLanguages?.includes(lang.id) ?? true
                    return (
                      <div key={lang.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`lang-${index}-${lang.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            let currentLangs = question.options?.allowedLanguages ?? AVAILABLE_LANGUAGES.map(l => l.id)
                            if (checked) {
                              currentLangs = [...currentLangs, lang.id]
                            } else {
                              currentLangs = currentLangs.filter((l: string) => l !== lang.id)
                            }
                            handleChange({ options: { ...question.options, allowedLanguages: currentLangs } })
                          }}
                        />
                        <Label htmlFor={`lang-${index}-${lang.id}`} className="text-sm cursor-pointer">{lang.label}</Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Starter Code (Optional)</Label>
                  <select 
                    className="text-sm bg-white border rounded px-2 py-1 outline-none"
                    value={starterCodeLang}
                    onChange={(e) => setStarterCodeLang(e.target.value)}
                  >
                    {AVAILABLE_LANGUAGES.filter(l => question.options?.allowedLanguages?.includes(l.id) ?? true).map(l => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <Textarea 
                  value={question.options?.starterCode?.[starterCodeLang] || ''}
                  onChange={(e) => {
                    const currentStarterCode = question.options?.starterCode || {}
                    handleChange({ 
                      options: { 
                        ...question.options, 
                        starterCode: { ...currentStarterCode, [starterCodeLang]: e.target.value } 
                      } 
                    })
                  }}
                  placeholder={`Provide boilerplate code for ${AVAILABLE_LANGUAGES.find(l => l.id === starterCodeLang)?.label}...`}
                  className="font-mono text-sm resize-y min-h-[100px]"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t">
                <Switch 
                  id={`autocomplete-${index}`}
                  checked={question.options?.disableAutocomplete ?? true}
                  onCheckedChange={(val) => handleChange({ options: { ...question.options, disableAutocomplete: val } })}
                />
                <Label htmlFor={`autocomplete-${index}`} className="text-sm cursor-pointer">
                  Disable Autocomplete & Suggestions
                </Label>
              </div>
            </div>

            {/* Test Cases Panel */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  Test Cases
                </h4>
                <Button variant="outline" size="sm" type="button" onClick={() => {
                  const currentTestCases = question.testCases || []
                  handleChange({ testCases: [...currentTestCases, { input: '', expectedOutput: '', isHidden: false }] })
                }}>
                  Add Test Case
                </Button>
              </div>
              
              <div className="space-y-3">
                {(question.testCases || []).map((tc, tcIndex) => (
                  <div key={tcIndex} className="flex flex-col sm:flex-row gap-4 items-start p-3 bg-white border rounded-md relative">
                    <div className="flex-1 w-full space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Input</Label>
                        <Input 
                          placeholder="e.g. 1\n2" 
                          value={tc.input} 
                          onChange={e => {
                            const newTc = [...(question.testCases || [])]
                            newTc[tcIndex].input = e.target.value
                            handleChange({ testCases: newTc })
                          }} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Expected Output</Label>
                        <Input 
                          placeholder="e.g. 3" 
                          value={tc.expectedOutput} 
                          onChange={e => {
                            const newTc = [...(question.testCases || [])]
                            newTc[tcIndex].expectedOutput = e.target.value
                            handleChange({ testCases: newTc })
                          }} 
                        />
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-3 sm:pt-6 w-full sm:w-auto justify-between sm:justify-start items-center sm:items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`hidden-${index}-${tcIndex}`}
                          checked={tc.isHidden}
                          onCheckedChange={(checked) => {
                            const newTc = [...(question.testCases || [])]
                            newTc[tcIndex].isHidden = !!checked
                            handleChange({ testCases: newTc })
                          }}
                        />
                        <Label htmlFor={`hidden-${index}-${tcIndex}`} className="text-xs cursor-pointer">
                          Hidden (Used only for grading)
                        </Label>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        type="button"
                        className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          const newTc = [...(question.testCases || [])]
                          newTc.splice(tcIndex, 1)
                          handleChange({ testCases: newTc })
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </div>
                  </div>
                ))}
                {!(question.testCases?.length) && (
                  <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-md bg-white">
                    No test cases added. Candidates will not be auto-graded correctly without them.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <Switch 
            id={`req-${index}`} 
            checked={!!question.required}
            onCheckedChange={(val) => handleChange({ required: val })}
          />
          <Label htmlFor={`req-${index}`} className="text-sm font-normal text-muted-foreground cursor-pointer">Required</Label>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onCopy} className="text-muted-foreground">
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
