'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clock, FileText, Loader2, AlertTriangle, Camera, CheckCircle2 } from 'lucide-react'
import Webcam from 'react-webcam'

interface CandidateRegistrationFormProps {
  paperId: string
  paper: {
    title: string
    jobTitle: string
    duration: number
    totalQuestions: number
  }
  initialEmail?: string
}

export function CandidateRegistrationForm({ paperId, paper, initialEmail }: CandidateRegistrationFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const webcamRef = useRef<Webcam>(null)
  const dispatch = useDispatch()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return toast.error('Please enter your full name')
    }
    if (!email.trim()) {
      return toast.error('Please enter your email')
    }


    setIsSubmitting(true)

    dispatch(questionPapersActions.createAttemptRequest({
      paperId,
      payload: { name, email },
      resolve: (data) => {
        setAttemptId(data.attemptId)
        setStep(2) // Move to instructions step
        setIsSubmitting(false)
      },
      reject: (err) => {
        console.error('6. Action REJECTED with error:', err)
        toast.error(err)
        setIsSubmitting(false)
      }
    }))
  }

  const handleStartTest = async (skipCamera = false) => {
    if (!cameraActive && !skipCamera) {
      return toast.error("Please allow camera access or skip to continue.");
    }

    try {
      setIsSubmitting(true)

      // Request fullscreen first
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => { });
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen().catch(() => { });
      }

      // Hit start API
      dispatch(questionPapersActions.startAttemptRequest({
        paperId,
        attemptId: attemptId!,
        resolve: () => {
          router.push(`/question-papers/take/${paperId}/test?attemptId=${attemptId}`)
        },
        reject: () => {
          toast.error('Failed to start test')
          setIsSubmitting(false)
        }
      }))
    } catch (e) {
      toast.error('Failed to start test');
      setIsSubmitting(false);
    }
  }

  if (step === 2) {
    return (
      <div className="bg-card border rounded-xl shadow-lg max-w-2xl w-full mx-auto p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Assessment Instructions</h2>

        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-yellow-600" />
            <div>
              <h4 className="font-semibold mb-1">Strict Proctoring Enabled</h4>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li><strong>Fullscreen is required:</strong> Exiting fullscreen will be recorded as a violation and penalize your score.</li>
                <li><strong>No Tab Switching:</strong> Navigating to other tabs or windows is strictly prohibited and heavily penalized.</li>
                <li><strong>Camera Monitoring:</strong> Your camera must remain on. Periodic snapshots will be taken for identity verification.</li>
              </ul>
            </div>
          </div>

          <div className="border rounded-lg p-6 flex flex-col items-center text-center bg-muted/20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="font-semibold mb-2">Camera Access Required</h4>
            <p className="text-sm text-muted-foreground mb-4">Please allow camera permissions in your browser to proceed.</p>

            <div className="w-full max-w-[320px] aspect-video bg-black rounded-lg overflow-hidden relative">
              <Webcam
                audio={false}
                ref={webcamRef}
                onUserMedia={() => setCameraActive(true)}
                onUserMediaError={() => toast.error("Camera access denied. You cannot take the test.")}
                className="object-cover w-full h-full"
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                  Waiting for camera...
                </div>
              )}
            </div>
            {cameraActive && (
              <p className="text-emerald-600 text-sm font-medium mt-3 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Camera connected
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col md:flex-row justify-end gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleStartTest(true)}
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            Skip Camera (Dev)
          </Button>
          <Button
            size="lg"
            onClick={() => handleStartTest(false)}
            disabled={!cameraActive || isSubmitting}
            className="w-full md:w-auto"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            I Understand, Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl shadow-lg overflow-hidden max-w-4xl w-full mx-auto grid md:grid-cols-5">
      {/* Left panel - Info */}
      <div className="bg-primary p-8 text-primary-foreground md:col-span-2 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{paper.title}</h2>
          <p className="text-primary-foreground/80 font-medium mb-8">{paper.jobTitle}</p>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/70">Duration</p>
                <p className="font-semibold">{paper.duration} minutes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/70">Questions</p>
                <p className="font-semibold">{paper.totalQuestions} questions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-sm text-primary-foreground/60">
          Please complete the registration form to begin your assessment. Ensure you have a stable internet connection before starting.
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="p-8 md:col-span-3">
        <h3 className="text-xl font-semibold mb-6">Candidate Details</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Email Address <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              required
              readOnly={!!initialEmail}
              className={!!initialEmail ? "bg-muted cursor-not-allowed" : ""}
            />
            {!!initialEmail && (
              <p className="text-xs text-muted-foreground mt-1">
                Your email is pre-filled from your invitation link.
              </p>
            )}
          </div>


          <div className="pt-4 border-t mt-8">
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Register & Proceed
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
