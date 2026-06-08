'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { RootState } from '@/store/rootReducer'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/common/PageHeader'
import { BackButton } from '@/components/common'
import { DashboardLayout } from '@/components/layout'
import { WizardStepper } from '@/components/question-papers/WizardStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SkillTagInput } from '@/components/question-papers/SkillTagInput'
import { SectionBuilder, Section } from '@/components/question-papers/SectionBuilder'
import { QuestionCard, QuestionData } from '@/components/question-papers/QuestionCard'
import { SkillBadgeList } from '@/components/question-papers/SkillBadgeList'
import { toast } from 'sonner'
import { Loader2, ArrowRight, ArrowLeft, Save, Sparkles, BookOpen } from 'lucide-react'
import { LibraryPickerModal } from '@/components/question-library/LibraryPickerModal'
import { Switch } from '@/components/ui/switch'

const STEPS = ['Job Details', 'Sections', 'Review', 'Generated Paper']

interface QuestionPaperWizardProps {
  mode?: 'create' | 'edit'
  paperId?: string
  initialData?: any
}

export function QuestionPaperWizard({ mode = 'create', paperId, initialData }: QuestionPaperWizardProps) {
  const router = useRouter()
  const { user } = useAuth()

  const [step, setStep] = useState(mode === 'edit' ? 3 : 0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Step 1 State
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [minExp, setMinExp] = useState('0')
  const [maxExp, setMaxExp] = useState('2')
  const [duration, setDuration] = useState('60')
  const [cutoffScore, setCutoffScore] = useState('70')
  const [skills, setSkills] = useState<string[]>([])

  // Step 2 State
  const [sections, setSections] = useState<Section[]>([{ title: 'Core Technical', questionCount: '5', weightage: '100' }])

  // Step 4 State
  const [generatedSections, setGeneratedSections] = useState<any[]>([])
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [randomizeOptions, setRandomizeOptions] = useState(false)
  const [paperStatus, setPaperStatus] = useState<'draft' | 'published'>('draft')
  const [linkExpiresAt, setLinkExpiresAt] = useState('')
  const [proctorViolationThreshold, setProctorViolationThreshold] = useState('5')
  const [consentRequired, setConsentRequired] = useState(true)
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false)
  const [libraryPickerSectionIndex, setLibraryPickerSectionIndex] = useState(0)

  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const dispatch = useDispatch()
  const { departments, suggestedSkills } = useSelector((state: RootState) => state.questionPapers)

  useEffect(() => {
    if (user?.organizationId) {
      dispatch(questionPapersActions.getDepartmentsRequest(user.organizationId))
    }

    if (mode === 'edit' && initialData) {
      setJobTitle(initialData.jobTitle || '')
      setDepartment(initialData.departmentName || '')
      setMinExp(initialData.minExp?.toString() || '0')
      setMaxExp(initialData.maxExp?.toString() || '0')
      setDuration(initialData.duration?.toString() || '60')
      setCutoffScore(initialData.cutoffScore?.toString() || '70')
      setSkills(initialData.skillsList ? initialData.skillsList.split(',').filter(Boolean) : [])

      const parsedSections = initialData.sections?.map((s: any) => ({
        title: s.title,
        weightage: s.weightage?.toString() || '0',
        questionCount: s.questions?.length?.toString() || '0',
        questions: s.questions?.map((q: any) => {
          let parsedOptions = null;
          if (q.options) {
            try {
              parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
            } catch (e) {
              parsedOptions = typeof q.options === 'string' ? q.options.split(',') : q.options;
            }
          }
          let parsedTestCases = null;
          if (q.testCases) {
            try {
              parsedTestCases = typeof q.testCases === 'string' ? JSON.parse(q.testCases) : q.testCases;
            } catch (e) {
              parsedTestCases = [];
            }
          }
          return {
            text: q.text,
            answer: q.answer,
            type: q.questionType,
            options: parsedOptions,
            testCases: parsedTestCases
          }
        }) || []
      })) || []

      setSections(parsedSections)
      setGeneratedSections(parsedSections)
      setPaperStatus(initialData.status || 'draft')
      setLinkExpiresAt(initialData.linkExpiresAt ? new Date(initialData.linkExpiresAt).toISOString().slice(0, 16) : '')
      setProctorViolationThreshold((initialData.proctorViolationThreshold || 5).toString())
      setConsentRequired(initialData.consentRequired !== false)
      setRandomizeQuestions(!!initialData.randomizeQuestions)
      setRandomizeOptions(!!initialData.randomizeOptions)
    } else {
      const draft = localStorage.getItem('question-paper-draft')
      if (draft) {
        try {
          const parsed = JSON.parse(draft)
          if (parsed.jobTitle) setJobTitle(parsed.jobTitle)
          if (parsed.department) setDepartment(parsed.department)
          if (parsed.minExp) setMinExp(parsed.minExp)
          if (parsed.maxExp) setMaxExp(parsed.maxExp)
          if (parsed.duration) setDuration(parsed.duration)
          if (parsed.cutoffScore) setCutoffScore(parsed.cutoffScore)
          if (parsed.skills && parsed.skills.length > 0) setSkills(parsed.skills)
          if (parsed.sections && parsed.sections.length > 0) setSections(parsed.sections)
        } catch (e) { }
      }
    }
    setIsLoaded(true)
  }, [user?.organizationId, mode, initialData])

  useEffect(() => {
    if (isLoaded && mode === 'create') {
      localStorage.setItem('question-paper-draft', JSON.stringify({
        jobTitle, department, minExp, maxExp, duration, cutoffScore, skills, sections
      }))
    }
  }, [isLoaded, jobTitle, department, minExp, maxExp, duration, cutoffScore, skills, sections, mode])

  const handleDepartmentChange = (val: string) => {
    setDepartment(val)
    const selectedDept = departments.find(d => d.name === val)
    if (selectedDept && selectedDept.sections && selectedDept.sections.length > 0) {
      const weightagePerSection = Math.floor(100 / selectedDept.sections.length)
      const newSections = selectedDept.sections.map((s: any, i: number) => ({
        title: s.name,
        questionCount: '5',
        weightage: (i === selectedDept.sections.length - 1)
          ? (100 - (weightagePerSection * i)).toString()
          : weightagePerSection.toString()
      }))
      setSections(newSections)
    } else {
      setSections([])
    }
  }

  const totalWeightage = sections.reduce((sum, s) => sum + (parseInt(s.weightage) || 0), 0)

  const handleNext = () => {
    if (step === 0) {
      if (!jobTitle || jobTitle.length < 3) return toast.error('Job title must be at least 3 characters')
      if (!department) return toast.error('Please select a department')

      const minE = parseInt(minExp) || 0
      const maxE = parseInt(maxExp) || 0
      if (minE >= maxE) return toast.error('Max experience must be strictly greater than min experience')

      if (!duration || parseInt(duration) <= 0) return toast.error('Please enter a valid duration')
      if (!cutoffScore || parseInt(cutoffScore) <= 0 || parseInt(cutoffScore) > 100) return toast.error('Please enter a valid cutoff score between 1 and 100')

      if (skills.length === 0) return toast.error('Please add at least one skill')
    }
    if (step === 1) {
      if (totalWeightage !== 100) return toast.error('Total weightage must be exactly 100%')
      if (sections.some(s => !s.title)) return toast.error('All sections must have a title')
      if (sections.some(s => !s.questionCount || parseInt(s.questionCount) <= 0)) return toast.error('Each section must have at least 1 question')
    }
    setStep(s => s + 1)
  }

  const handleBack = () => setStep(s => s - 1)

  const generatePaper = () => {
    setIsGenerating(true)
    dispatch(questionPapersActions.generatePaperRequest({
      payload: { jobTitle, department, minExp, maxExp, duration, skills, sections },
      resolve: (data) => {
        setGeneratedSections(data.sections || [])
        setStep(3)
        setIsGenerating(false)
      },
      reject: () => {
        toast.error('Failed to generate paper. Please try again.')
        setIsGenerating(false)
      }
    }))
  }

  const suggestSkills = () => {
    if (!jobTitle) return toast.error('Please enter a Job Title first')
    setIsSuggestingSkills(true)

    // We dispatch an action with a callback, or just rely on a promise
    dispatch(questionPapersActions.suggestSkillsRequest({
      jobTitle, department,
      resolve: (data: any) => {
        if (data && data.skills) {
          const newSkills = [...new Set([...skills, ...data.skills])]
          setSkills(newSkills)
          toast.success('Skills generated!')
        }
        setIsSuggestingSkills(false)
      },
      reject: () => {
        toast.error('Failed to generate skills')
        setIsSuggestingSkills(false)
      }
    }))
  }

  const savePaper = async () => {
    if (!user) return

    try {
      setIsSaving(true)

      // Validate questions
      for (const section of generatedSections) {
        for (let i = 0; i < section.questions.length; i++) {
          const q = section.questions[i];
          const strippedText = q.text.replace(/<[^>]*>?/gm, '').trim();
          if (!strippedText) {
            setIsSaving(false);
            return toast.error(`Please add proper text for question ${i + 1} in ${section.title}`);
          }
          if (q.type === 'MCQ') {
            if (q.options.some((opt: string) => !opt.trim())) {
              setIsSaving(false);
              return toast.error(`Please fill all options for question ${i + 1} in ${section.title}`);
            }
            if (!q.answer) {
              setIsSaving(false);
              return toast.error(`Please select an answer for question ${i + 1} in ${section.title}`);
            }
          } else if (!q.answer || q.answer.trim() === '') {
            setIsSaving(false);
            return toast.error(`Please provide an expected answer/code for question ${i + 1} in ${section.title}`);
          }
        }
      }

      const totalQuestions = generatedSections.reduce((sum, s) => sum + s.questions.length, 0)

      const normalizedSections = generatedSections.map((gs, i) => ({
        title: gs.title,
        weightage: gs.weightage || sections[i]?.weightage || '0',
        questions: (gs.questions || []).map((q: any) => {
          const inferredType =
            q.type ||
            q.questionType ||
            (Array.isArray(q.options) && q.options.length > 0 ? 'MCQ' : 'SA')

          return {
            ...q,
            type: inferredType,
            questionType: inferredType,
            // Ensure MCQ options are preserved as array for preview/save
            options:
              inferredType === 'MCQ'
                ? (Array.isArray(q.options) ? q.options : ['', '', '', ''])
                : q.options ?? null,
          }
        })
      }))

      const payload = {
        organizationId: user.organizationId || null,
        createdById: user.id,
        title: `${jobTitle} Assessment`,
        jobTitle,
        departmentName: department,
        minExp, maxExp, duration, cutoffScore,
        status: paperStatus,
        linkExpiresAt: linkExpiresAt || null,
        proctorViolationThreshold: parseInt(proctorViolationThreshold) || 5,
        consentRequired,
        randomizeQuestions,
        randomizeOptions,
        skillsList: skills.join(','),
        totalQuestions,
        sections: normalizedSections
      }

    dispatch(questionPapersActions.savePaperRequest({
      payload,
      isEdit: mode === 'edit',
      paperId: paperId,
      resolve: () => {
        toast.success(mode === 'edit' ? (initialData?.isTemplate ? 'Test Template updated!' : 'Question paper updated!') : 'Question paper saved successfully!')
        if (mode === 'create') {
          localStorage.removeItem('question-paper-draft')
        }
        setIsSaving(false)
        if (initialData?.isTemplate) {
          router.push('/super-admin/test-templates')
        } else {
          router.push('/question-papers')
        }
      },
      reject: (err: string) => {
        toast.error(err || (mode === 'edit' ? 'Failed to update.' : 'Failed to save.'))
        setIsSaving(false)
      }
    }))
  } catch (error) {
    setIsSaving(false)
  }
}

const updateQuestion = (sIndex: number, qIndex: number, newQuestion: QuestionData) => {
  const newSections = [...generatedSections]
  newSections[sIndex].questions[qIndex] = newQuestion
  setGeneratedSections(newSections)
}

const deleteQuestion = (sIndex: number, qIndex: number) => {
  const newSections = [...generatedSections]
  newSections[sIndex].questions.splice(qIndex, 1)
  setGeneratedSections(newSections)
}

const copyQuestion = (sIndex: number, qIndex: number) => {
  const newSections = [...generatedSections]
  const qToCopy = newSections[sIndex].questions[qIndex]
  newSections[sIndex].questions.splice(qIndex + 1, 0, JSON.parse(JSON.stringify(qToCopy)))
  setGeneratedSections(newSections)
}

const addQuestion = (sIndex: number, type: 'MCQ' | 'SA' | 'CODE') => {
  const newSections = [...generatedSections]
  newSections[sIndex].questions.push({
    text: '',
    type,
    options: type === 'MCQ' ? ['', '', '', ''] : type === 'CODE' ? {
      allowedLanguages: ['javascript', 'python', 'java', 'cpp', 'go', 'typescript'],
      starterCode: {},
      disableAutocomplete: true
    } : null,
    answer: ''
  })
  setGeneratedSections(newSections)
}

const addSection = () => {
  setGeneratedSections([...generatedSections, { title: 'New Section', weightage: '0', questions: [] }])
}

const handleAddFromLibrary = (libraryQuestions: any[]) => {
  const newSections = [...generatedSections]
  const mappedQuestions = libraryQuestions.map(lq => ({
    text: lq.text,
    type: lq.questionType,
    questionType: lq.questionType,
    options: lq.options || (lq.questionType === 'MCQ' ? ['', '', '', ''] : null),
    answer: lq.answer,
    testCases: lq.testCases || null,
    sourceLibraryQuestionId: lq.id,
  }))
  newSections[libraryPickerSectionIndex].questions.push(...mappedQuestions)

  setGeneratedSections(newSections)
  toast.success(`${libraryQuestions.length} question(s) added from library.`)
  }

const updateSectionDetails = (sIndex: number, field: string, value: string) => {
  const newSections = [...generatedSections]
  newSections[sIndex][field] = value
  setGeneratedSections(newSections)
}

return (
  <>
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton href={initialData?.isTemplate ? "/super-admin/test-templates" : "/question-papers"} />
          <PageHeader title={mode === 'edit' ? (initialData?.isTemplate ? "Edit Test Template" : "Edit Question Paper") : "Generate Question Paper"} />
        </div>
        <div className="max-w-5xl mx-auto space-y-6">
          {mode === 'create' && (
            <div className="px-6 md:px-8">
              <WizardStepper steps={STEPS} currentStep={step} />
            </div>
          )}

          <div className={mode === 'create' && step < 3 ? "bg-card border rounded-xl shadow-sm p-6 md:p-8" : ""}>
            {step === 0 && mode === 'create' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-6">Job Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Job Title <span className="text-destructive">*</span></Label>
                      <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
                    </div>
                    <div className="space-y-2">
                      <Label>Department <span className="text-destructive">*</span></Label>
                      {initialData?.isTemplate ? (
                        <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
                      ) : (
                        <Select value={department} onValueChange={handleDepartmentChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(d => (
                              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Experience Range (Years) <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" value={minExp} onChange={e => setMinExp(e.target.value)} className="w-full" />
                        <span className="text-muted-foreground whitespace-nowrap">to</span>
                        <Input type="number" min="0" value={maxExp} onChange={e => setMaxExp(e.target.value)} className="w-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration & Cutoff <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 w-1/2">
                          <Input type="number" min="10" value={duration} onChange={e => setDuration(e.target.value)} className="w-full" />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                        </div>
                        <div className="flex items-center gap-2 w-1/2">
                          <Input type="number" min="1" max="100" value={cutoffScore} onChange={e => setCutoffScore(e.target.value)} className="w-full" />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">% cutoff</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <div className="flex justify-between items-center">
                      <Label>Required Skills <span className="text-destructive">*</span></Label>
                      <Button variant="ghost" size="sm" onClick={suggestSkills} disabled={isSuggestingSkills} type="button">
                        {isSuggestingSkills ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-primary" />}
                        AI Suggest Skills
                      </Button>
                    </div>
                    <SkillTagInput organizationId={user?.organizationId || ''} value={skills} onChange={setSkills} />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && mode === 'create' && (
              <SectionBuilder sections={sections} onChange={setSections} />
            )}

            {step === 2 && mode === 'create' && (
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Review & Generate</h2>
                  <p className="text-muted-foreground">The AI will generate questions based on the following configuration.</p>
                </div>

                <div className="bg-muted/30 rounded-lg p-6 border">
                  <h3 className="font-semibold mb-4 text-lg">Configuration Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div><dt className="text-muted-foreground">Job Title</dt><dd className="font-medium">{jobTitle}</dd></div>
                    <div><dt className="text-muted-foreground">Department</dt><dd className="font-medium">{department}</dd></div>
                    <div><dt className="text-muted-foreground">Experience</dt><dd className="font-medium">{minExp} - {maxExp} years</dd></div>
                    <div><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{duration} min</dd></div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground mb-1">Skills</dt>
                      <dd className="font-medium">
                        <SkillBadgeList skills={skills} />
                      </dd>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Sections Configuration</h4>
                    <div className="space-y-2">
                      {sections.map((s, i) => (
                        <div key={i} className="flex justify-between items-center bg-background border p-3 rounded-md">
                          <span className="font-medium">{s.title}</span>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{s.questionCount} Questions</span>
                            <span>{s.weightage}% Weight</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                {/* <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{mode === 'edit' ? 'Edit Paper' : 'Generated Paper'}</h2>
                <p className="text-muted-foreground text-sm">Review, edit, and save your paper.</p>
              </div> */}

                {/* Editable Paper Settings */}
                <div className="bg-muted/30 rounded-lg p-6 border space-y-6">
                  <h3 className="font-semibold text-lg">Paper Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Job Title <span className="text-destructive">*</span></Label>
                      <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Department <span className="text-destructive">*</span></Label>
                      {initialData?.isTemplate ? (
                        <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
                      ) : (
                        <Select value={department} onValueChange={handleDepartmentChange}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Department" /></SelectTrigger>
                          <SelectContent>
                            {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Experience Range (Years) <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" value={minExp} onChange={e => setMinExp(e.target.value)} className="w-full" />
                        <span className="text-muted-foreground whitespace-nowrap">to</span>
                        <Input type="number" min="0" value={maxExp} onChange={e => setMaxExp(e.target.value)} className="w-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration & Cutoff <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 w-1/2">
                          <Input type="number" min="10" value={duration} onChange={e => setDuration(e.target.value)} className="w-full" />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                        </div>
                        <div className="flex items-center gap-2 w-1/2">
                          <Input type="number" min="1" max="100" value={cutoffScore} onChange={e => setCutoffScore(e.target.value)} className="w-full" />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">% cutoff</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Required Skills <span className="text-destructive">*</span></Label>
                    </div>
                    <SkillTagInput organizationId={user?.organizationId || ''} value={skills} onChange={setSkills} />
                  </div>
                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold">Test Settings</Label>
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Paper Status</Label>
                          <Select value={paperStatus} onValueChange={(v: 'draft' | 'published') => setPaperStatus(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Link Expiry (optional)</Label>
                          <Input type="datetime-local" value={linkExpiresAt} onChange={e => setLinkExpiresAt(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Proctor Violation Threshold</Label>
                          <Input type="number" min="1" value={proctorViolationThreshold} onChange={e => setProctorViolationThreshold(e.target.value)} />
                        </div>
                        <div className="flex items-center justify-between pt-6">
                          <div>
                            <p className="text-sm font-medium">Require Candidate Consent</p>
                            <p className="text-xs text-muted-foreground">Consent screen must be accepted before test starts</p>
                          </div>
                          <Switch checked={consentRequired} onCheckedChange={setConsentRequired} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Randomize Question Order</p>
                          <p className="text-xs text-muted-foreground">Each candidate sees questions in a different order</p>
                        </div>
                        <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Randomize MCQ Options</p>
                          <p className="text-xs text-muted-foreground">Shuffle the order of answer options for MCQ questions</p>
                        </div>
                        <Switch checked={randomizeOptions} onCheckedChange={setRandomizeOptions} />
                      </div>
                    </div>
                  </div>
                </div>

                {generatedSections.map((section, sIndex) => (
                  <div key={sIndex} className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-muted px-4 py-3 rounded-md gap-4">
                      <div className="flex-1 w-full">
                        <Input
                          value={section.title}
                          onChange={e => updateSectionDetails(sIndex, 'title', e.target.value)}
                          placeholder="Section Title (e.g. Technical Skills)"
                          className="font-semibold bg-background"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-sm font-medium whitespace-nowrap">Weightage %</span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={section.weightage}
                          onChange={e => updateSectionDetails(sIndex, 'weightage', e.target.value)}
                          className="w-24 bg-background"
                        />
                      </div>
                    </div>
                    <div className="space-y-4 pl-2">
                      {section.questions.map((q: any, qIndex: number) => (
                        <QuestionCard
                          key={qIndex}
                          index={qIndex}
                          question={q}
                          onChange={(newQ) => updateQuestion(sIndex, qIndex, newQ)}
                          onDelete={() => deleteQuestion(sIndex, qIndex)}
                          onCopy={() => copyQuestion(sIndex, qIndex)}
                        />
                      ))}
                      <div className="flex gap-2 justify-center py-4 border-2 border-dashed rounded-lg border-muted">
                        <Button variant="secondary" size="sm" onClick={() => addQuestion(sIndex, 'MCQ')}>+ Add MCQ</Button>
                        <Button variant="secondary" size="sm" onClick={() => addQuestion(sIndex, 'SA')}>+ Add Short Answer</Button>
                        <Button variant="secondary" size="sm" onClick={() => addQuestion(sIndex, 'CODE')}>+ Add Code Question</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setLibraryPickerSectionIndex(sIndex); setLibraryPickerOpen(true) }}
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Pick from Library
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={addSection} type="button">
                    + Add New Section
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between items-center pt-6 border-t">
              {mode === 'create' ? (
                <Button variant="outline" onClick={handleBack} disabled={step === 0 || isGenerating || isSaving}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div /> // spacer
              )}

              {step < 2 && mode === 'create' && (
                <Button onClick={handleNext}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {step === 2 && mode === 'create' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Allow moving ahead without AI and pick directly from library
                      if (!generatedSections.length) {
                        setGeneratedSections([{ title: 'Library Section', weightage: '100', questions: [] }])
                      }
                      setStep(3)
                      setLibraryPickerSectionIndex(0)
                      setLibraryPickerOpen(true)
                    }}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Select from Library
                  </Button>
                  <Button onClick={generatePaper} disabled={isGenerating} className="bg-primary">
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate with AI
                  </Button>
                </div>
              )}

              {step === 3 && (
                <Button onClick={savePaper} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {mode === 'edit' ? (initialData?.isTemplate ? 'Update Test Template' : 'Update Question Paper') : 'Save Question Paper'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
    {user?.organizationId && (
      <LibraryPickerModal
        isOpen={libraryPickerOpen}
        onClose={() => setLibraryPickerOpen(false)}
        organizationId={user.organizationId}
        onAdd={handleAddFromLibrary}
      />
    )}
  </>
)
}
