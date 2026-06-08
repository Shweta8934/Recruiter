'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2, Bookmark, BookmarkCheck, Play, RotateCcw, Hexagon } from 'lucide-react'
import { toast } from 'sonner'
import Webcam from 'react-webcam'
import Editor from '@monaco-editor/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function TestEnvironment({ paper, attempt }: { paper: any, attempt: any }) {
  const router = useRouter()
  const dispatch = useDispatch()

  // Flatten questions — shuffle within sections if randomizeQuestions is enabled
  const allQuestions = useMemo(() => {
    const flat: any[] = []
    paper.sections.forEach((s: any) => {
      const sectionQuestions = [...s.questions];

      // Randomize within the section if paper setting is enabled
      if (paper.randomizeQuestions) {
        for (let i = sectionQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sectionQuestions[i], sectionQuestions[j]] = [sectionQuestions[j], sectionQuestions[i]];
        }
      }

      sectionQuestions.forEach((q: any) => {
        flat.push({ ...q, sectionTitle: s.title })
      })
    })
    return flat
  }, [paper])


  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [codeLanguages, setCodeLanguages] = useState<Record<string, string>>({})
  const [codeOutput, setCodeOutput] = useState<Record<string, string>>({})
  const [isExecuting, setIsExecuting] = useState<Record<string, boolean>>({})
  const [visited, setVisited] = useState<Set<string>>(new Set([allQuestions[0]?.id]))
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showResetModal, setShowResetModal] = useState(false)
  // Server-first hydration: use DB draft first, local draft only as fallback.
  useEffect(() => {
    try {
      const serverDraft = attempt.responseDraftJson as any
      if (serverDraft && Object.keys(serverDraft).length > 0) {
        if (serverDraft.answers) setAnswers(serverDraft.answers)
        if (serverDraft.codeLanguages) setCodeLanguages(serverDraft.codeLanguages)
        if (serverDraft.visited) setVisited(new Set(serverDraft.visited))
        if (serverDraft.marked) setMarked(new Set(serverDraft.marked))
        if (serverDraft.currentIdx !== undefined) setCurrentIdx(serverDraft.currentIdx)
        return
      }

      const draftStr = localStorage.getItem(`draft_${attempt.id}`)
      if (draftStr) {
        const draft = JSON.parse(draftStr)
        if (draft.answers) setAnswers(draft.answers)
        if (draft.codeLanguages) setCodeLanguages(draft.codeLanguages)
        if (draft.visited) setVisited(new Set(draft.visited))
        if (draft.marked) setMarked(new Set(draft.marked))
        if (draft.currentIdx !== undefined) setCurrentIdx(draft.currentIdx)
      }
    } catch (e) {
      console.warn("Failed to hydrate draft state", e);
    }
  }, [attempt.id, attempt.responseDraftJson]);

  // Save draft to LocalStorage whenever state changes
  useEffect(() => {
    try {
      const draft = {
        answers,
        codeLanguages,
        visited: Array.from(visited),
        marked: Array.from(marked),
        currentIdx
      };
      localStorage.setItem(`draft_${attempt.id}`, JSON.stringify(draft));
    } catch (e) {
      // Save to localStorage failed — silently continue
    }
  }, [answers, codeLanguages, visited, marked, currentIdx, attempt.id]);

  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [consentAccepted, setConsentAccepted] = useState(!!attempt.consentAcceptedAt)

  // Proctoring States
  const webcamRef = useRef<Webcam>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [mediaStreamsReady, setMediaStreamsReady] = useState(false)
  const [mobileStreamActive, setMobileStreamActive] = useState(attempt.mobileStreamActive || false)
  const [isFullscreenLocked, setIsFullscreenLocked] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isLocalhost, setIsLocalhost] = useState(false)

  useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost')
  }, [])

  useEffect(() => {
    const checkCompletedAttempt = () => {
      dispatch(questionPapersActions.checkAttemptStatusRequest({
        paperId: paper.id,
        attemptId: attempt.id,
        cache: 'no-store',
        resolve: (data: any) => {
          if (data?.attempt?.isCompleted) {
            router.replace(`/question-papers/take/${paper.id}/completed`)
          }
        }
      }))
    }

    checkCompletedAttempt()
  }, [paper.id, attempt.id, router, dispatch])

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const lastAudioViolationRef = useRef(0)

  // Poll for Mobile Pairing Status in High-Security Mode
  useEffect(() => {
    if (!paper.highSecurity || mobileStreamActive || permissionsGranted) return

    const checkStatus = () => {
      dispatch(questionPapersActions.checkAttemptStatusRequest({
        paperId: paper.id,
        attemptId: attempt.id,
        resolve: (data: any) => {
          if (data.attempt?.mobileStreamActive) {
            setMobileStreamActive(true)
            toast.success("Mobile camera linked successfully!")
          }
        }
      }))
    }

    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [paper.highSecurity, mobileStreamActive, permissionsGranted, paper.id, attempt.id, dispatch])

  // Initialization (resume-aware)
  useEffect(() => {
    if (!attempt.startTime || !permissionsGranted) return;
    const start = new Date(attempt.startTime).getTime();
    const baseRemaining = typeof attempt.remainingSeconds === 'number' ? attempt.remainingSeconds : null;
    const end = baseRemaining !== null ? (Date.now() + baseRemaining * 1000) : (start + (paper.duration * 60000));

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        toast.error("Time is up! Submitting automatically.");
        handleSubmit();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attempt.startTime, paper.duration, permissionsGranted]);

  // Periodic server autosave (15s)
  useEffect(() => {
    if (!permissionsGranted || isSubmitting) return
    const interval = setInterval(() => {
      dispatch(questionPapersActions.autosaveAttemptRequest({
        paperId: paper.id,
        attemptId: attempt.id,
        payload: {
          answers,
          codeLanguages,
          currentIdx,
          visited: Array.from(visited),
          marked: Array.from(marked),
          remainingSeconds: timeLeft,
          consentAccepted
        }
      }))
    }, 15000)
    return () => clearInterval(interval)
  }, [permissionsGranted, isSubmitting, paper.id, attempt.id, answers, codeLanguages, currentIdx, visited, marked, timeLeft, consentAccepted, dispatch])

  // Autosave on unload/navigation
  useEffect(() => {
    const onBeforeUnload = () => {
      navigator.sendBeacon(
        `/api/question-papers/${paper.id}/attempts/${attempt.id}/autosave`,
        new Blob([JSON.stringify({
          answers,
          codeLanguages,
          currentIdx,
          visited: Array.from(visited),
          marked: Array.from(marked),
          remainingSeconds: timeLeft,
          consentAccepted
        })], { type: 'application/json' })
      )
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [paper.id, attempt.id, answers, codeLanguages, currentIdx, visited, marked, timeLeft, consentAccepted])

  // Proctoring: Tab Switch & Fullscreen Exit
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const assessmentSettings = (paper.organization as any)?.settings?.assessment || {};
        const flagThreshold = assessmentSettings.flagThreshold;
        const maxSwitches = flagThreshold ? Number(flagThreshold) : (paper.highSecurity ? 2 : 3);
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= maxSwitches) {
            toast.error('Maximum tab switches exceeded. Submitting test automatically.');
            logViolation('TAB_SWITCH_LIMIT_EXCEEDED', `Candidate switched tabs ${maxSwitches} times. Test auto-submitted.`);
            handleSubmit();
          } else {
            toast.error(`Warning: Tab switching is recorded. (${newCount}/${maxSwitches} warnings before auto-submit)`);
            logViolation('TAB_SWITCH', 'Candidate switched away from the test tab.');
          }
          return newCount;
        });
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation('FULLSCREEN_EXIT', 'Candidate exited fullscreen mode.');
        if (paper.highSecurity) {
          setIsFullscreenLocked(true)
          toast.error('Lockdown Alert: Fullscreen mode exited! Re-enter fullscreen to continue the test.')
        } else {
          toast.error('Warning: Exiting fullscreen is recorded.');
        }
      } else {
        setIsFullscreenLocked(false)
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        toast.error('Developer tools and screenshots are disabled.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Periodic Snapshot
  useEffect(() => {
    if (!cameraActive || !permissionsGranted) return;
    const assessmentSettings = (paper.organization as any)?.settings?.assessment || {};
    const intervalSec = assessmentSettings.proctorSnapshotIntervalSec ? Number(assessmentSettings.proctorSnapshotIntervalSec) : 120;
    const interval = setInterval(() => {
      captureSnapshot('PERIODIC_CHECK');
    }, intervalSec * 1000);
    return () => clearInterval(interval);
  }, [cameraActive, permissionsGranted, paper.organization]);

  const captureSnapshot = useCallback(async (type: string = 'PERIODIC_CHECK') => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();

    let screenSrc = undefined;
    if (videoElementRef.current && videoElementRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElementRef.current.videoWidth;
      canvas.height = videoElementRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElementRef.current, 0, 0, canvas.width, canvas.height);
        screenSrc = canvas.toDataURL('image/jpeg', 0.5);
      }
    }

    if (imageSrc) {
      logViolation(type, 'Snapshot captured', imageSrc);
    }

    if (screenSrc && type === 'PERIODIC_CHECK') {
      logViolation('SCREEN_SNAPSHOT', 'Screen snapshot captured', screenSrc);
    }
  }, [webcamRef]);

  // Audio Monitoring
  useEffect(() => {
    if (!permissionsGranted) return;

    const interval = setInterval(() => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;

        if (average > 40) {
          const now = Date.now();
          if (now - lastAudioViolationRef.current > 30000) {
            lastAudioViolationRef.current = now;
            logViolation('AUDIO_NOISE_DETECTED', `Significant background noise or talking detected.`);
            toast.error('Warning: Audio noise detected! Please remain quiet.');
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [permissionsGranted]);

  // Clean up streams and AudioContext on unmount
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (videoElementRef.current) {
        try {
          document.body.removeChild(videoElementRef.current);
        } catch (e) {
          // ignore if already removed
        }
      }
    };
  }, []);

  const requestPermissions = async () => {
    setCheckingPermissions(true)
    setPermissionError(null)
    try {
      toast.loading('Accessing camera...', { id: 'proctor-loading' })
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })

      toast.loading('Accessing microphone...', { id: 'proctor-loading' })
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })

      toast.loading('Combining media streams...', { id: 'proctor-loading' })
      // Combine them into a single stream
      const userMedia = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()])

      toast.loading('Setting up audio analysis...', { id: 'proctor-loading' })
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(userMedia)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioCtx
      analyserRef.current = analyser

      // Handle screen sharing setup conditionally (only if supported by browser/device)
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        toast.loading('Requesting screen sharing...', { id: 'proctor-loading' })
        try {
          const displayMedia = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
          screenStreamRef.current = displayMedia

          if (!videoElementRef.current) {
            const video = document.createElement('video')
            video.style.display = 'none'
            video.autoplay = true
            video.muted = true
            document.body.appendChild(video)
            videoElementRef.current = video
          }
          videoElementRef.current.srcObject = displayMedia

          displayMedia.getVideoTracks()[0].onended = () => {
            logViolation('SCREEN_SHARE_STOPPED', 'Candidate stopped sharing their screen.')
            toast.error('Screen sharing stopped! This is a major violation.')
          }
        } catch (screenErr: any) {
          console.warn("[Proctoring] Screen sharing permission denied/cancelled:", screenErr)
          throw new Error("Screen sharing permission is required to start the test. Please try again.")
        }
      } else {
        toast.dismiss('proctor-loading')
        toast.info('Screen sharing bypassed. Proceeding with camera & microphone monitoring.')
      }

      toast.success('Permissions granted! Camera feed is ready.', { id: 'proctor-loading' })
      setMediaStreamsReady(true)

    } catch (err: any) {
      // Permission setup error — shown in toast below
      const errMsg = err.message || err.toString() || 'Permissions denied. Please allow camera and microphone access to start the test.'
      setPermissionError(errMsg)
      toast.error(`Permission Error: ${errMsg}`, { id: 'proctor-loading' })
    } finally {
      setCheckingPermissions(false)
    }
  }

  const verifyFaceAndStart = async () => {
    if (paper.consentRequired && !consentAccepted) {
      toast.error('Please accept the proctoring consent before starting the test.')
      return
    }
    if (!webcamRef.current) {
      return toast.error("Camera is not initialized yet. Please wait.")
    }
    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) {
      return toast.error("Could not capture image from webcam. Please try again.")
    }

    setCheckingPermissions(true)
    setPermissionError(null)
    toast.loading('Verifying identity & detecting face...', { id: 'face-loading' })

    dispatch(questionPapersActions.verifyFaceRequest({
      paperId: paper.id,
      attemptId: attempt.id,
      image: imageSrc,
      resolve: (data) => {
        if (data.faceDetected) {
          toast.success('Identity verified! Starting test...', { id: 'face-loading' })

          // Log the baseline IDENTITY_CHECK violation with the baseline image
          logViolation('IDENTITY_CHECK', 'Initial face validation succeeded.', imageSrc)

          // Grant entry to test
          setPermissionsGranted(true)
        } else {
          const failMsg = data.reason || "Face not detected. Please ensure your face is fully visible in front of the camera and try again."
          setPermissionError(failMsg)
          toast.error(failMsg, { id: 'face-loading', duration: 5000 })

          // Log this failed attempt as a violation
          logViolation('IDENTITY_CHECK_FAIL', `Identity check failed: ${failMsg}`, imageSrc)
        }
        setCheckingPermissions(false)
      },
      reject: (errMsg) => {
        setPermissionError(errMsg)
        toast.error(errMsg, { id: 'face-loading' })
        setCheckingPermissions(false)
      }
    }))
  }

  const reEnterFullscreen = async () => {
    const docEl = document.documentElement as any;
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
      setIsFullscreenLocked(false)
    } catch (e) {
      toast.error("Failed to re-enter fullscreen. Please try again.")
    }
  }

  const logViolation = async (violationType: string, description: string, mediaUrl?: string) => {
    dispatch(questionPapersActions.reportViolationRequest({
      paperId: paper.id,
      attemptId: attempt.id,
      payload: { violationType, description, mediaUrl }
    }))
  };

  const handleAnswer = (questionId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const handleLanguageChange = (questionId: string, lang: string) => {
    setCodeLanguages(prev => ({ ...prev, [questionId]: lang }));
  };

  const handleRunCode = async (questionId: string) => {
    const code = answers[questionId];
    if (!code?.trim()) return toast.error("Please write some code before running.");

    const language = codeLanguages[questionId] || 'javascript';
    let rawTestCases = currentQuestion.testCases || [];
    if (typeof rawTestCases === 'string') {
      try { rawTestCases = JSON.parse(rawTestCases); } catch { rawTestCases = []; }
    }
    const testCasesArr = Array.isArray(rawTestCases) ? rawTestCases : [];
    const testCases = testCasesArr.filter((tc: any) => !tc.isHidden);
    const hiddenCount = testCasesArr.filter((tc: any) => tc.isHidden).length;

    setIsExecuting(prev => ({ ...prev, [questionId]: true }));
    setCodeOutput(prev => ({ ...prev, [questionId]: "Executing..." }));

    dispatch(questionPapersActions.executeCodeRequest({
      code,
      language,
      testCases,
      resolve: (data) => {
        if (data.testCaseResults) {
          setCodeOutput(prev => ({
            ...prev,
            [questionId]: JSON.stringify({ isTestCases: true, results: data.testCaseResults, hiddenCount })
          }));
        } else {
          setCodeOutput(prev => ({ ...prev, [questionId]: data.output }));
        }
        setIsExecuting(prev => ({ ...prev, [questionId]: false }));
      },
      reject: (err) => {
        setCodeOutput(prev => ({ ...prev, [questionId]: `Error: ${err}` }));
        setIsExecuting(prev => ({ ...prev, [questionId]: false }));
      }
    }))
  };

  const toggleMarkForReview = () => {
    const qId = currentQuestion.id;
    setMarked(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const jumpToQuestion = (idx: number) => {
    setCurrentIdx(idx);
    setVisited(prev => {
      const next = new Set(prev);
      next.add(allQuestions[idx].id);
      return next;
    });
  };

  const nextQuestion = () => {
    if (currentIdx < allQuestions.length - 1) jumpToQuestion(currentIdx + 1);
  };

  const prevQuestion = () => {
    if (currentIdx > 0) jumpToQuestion(currentIdx - 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const finalCodeLanguages = { ...codeLanguages };
    allQuestions.forEach((question) => {
      if (question.questionType !== 'CODE') return;
      if (!finalCodeLanguages[question.id]) {
        finalCodeLanguages[question.id] = getDefaultLanguageForQuestion(question);
      }
    });


  setIsSubmitting(true);
  dispatch(questionPapersActions.submitAttemptRequest({
    paperId: paper.id,
    attemptId: attempt.id,
    payload: { answers, codeLanguages: finalCodeLanguages },
    resolve: () => {
      // Clear localStorage draft upon successful submission
      localStorage.removeItem(`draft_${attempt.id}`);
      router.push(`/question-papers/take/${paper.id}/completed`);
      setIsSubmitting(false);
    },
    reject: (err?: string) => {
      const message = String(err || 'Error submitting test. Please try again.')
      if (message.toLowerCase().includes('already submitted') || message.toLowerCase().includes('already completed')) {
        router.replace(`/question-papers/take/${paper.id}/completed`)
        return
      }
      toast.error(message)
      setIsSubmitting(false);
    }
  }))
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getQuestionStatus = (q: any, idx: number) => {
  if (idx === currentIdx) return 'current';
  if (marked.has(q.id)) return 'marked';
  if (answers[q.id]) return 'answered';
  if (visited.has(q.id)) return 'not_answered';
  return 'not_visited';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'current': return 'bg-primary text-white border-primary';
    case 'answered': return 'bg-primary text-white border-primary';
    case 'not_answered': return 'bg-red-500 text-white border-red-500';
    case 'marked': return 'bg-amber-500 text-white border-amber-500';
    default: return 'bg-muted text-muted-foreground border-transparent hover:border-border';
  }
};

const getParsedOptions = (opts: any): string[] => {
  if (!opts) return [];
  if (Array.isArray(opts)) return opts;
  try {
    const parsed = typeof opts === 'string' ? JSON.parse(opts) : opts;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getParsedCodeConfig = (opts: any) => {
  const defaultConfig = {
    allowedLanguages: ['javascript', 'python', 'java', 'cpp', 'go', 'typescript'],
    starterCode: {} as Record<string, string>,
    disableAutocomplete: true
  };
  if (!opts) return defaultConfig;
  try {
    const parsed = typeof opts === 'string' ? JSON.parse(opts) : opts;
    if (Array.isArray(parsed)) return defaultConfig;
    return {
      allowedLanguages: parsed.allowedLanguages || defaultConfig.allowedLanguages,
      starterCode: parsed.starterCode || {},
      disableAutocomplete: parsed.disableAutocomplete ?? defaultConfig.disableAutocomplete
    };
  } catch {
    return defaultConfig;
  }
};

const getDefaultLanguageForQuestion = (question: any) => {
  const codeConfig = getParsedCodeConfig(question.options);
  const availableLangs = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
    { id: 'cpp', label: 'C++' },
    { id: 'go', label: 'Go' },
    { id: 'typescript', label: 'TypeScript' }
  ].filter(l => codeConfig.allowedLanguages.includes(l.id));

  return availableLangs.length > 0 ? availableLangs[0].id : 'javascript';
};

const currentQuestion = allQuestions[currentIdx];

// Calculate stats for Legend
let statAnswered = 0, statNotAnswered = 0, statNotVisited = 0, statMarked = 0;
allQuestions.forEach((q, i) => {
  const st = getQuestionStatus(q, i);
  if (st === 'answered') statAnswered++;
  if (st === 'not_answered') statNotAnswered++;
  if (st === 'not_visited') statNotVisited++;
  if (st === 'marked') statMarked++;
});

if (!permissionsGranted) {
  const mobileStreamUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/question-papers/take/${paper.id}/mobile-stream?attemptId=${attempt.id}`
    : ''

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border text-center flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-2">Proctoring Setup</h2>

        {/* Step 1: Request Browser Permissions */}
        {!mediaStreamsReady && (
          <>
            <p className="text-slate-600 text-sm mb-6">
              This test requires a strict proctoring environment. You must grant camera and microphone access to proceed.
            </p>
            {permissionError && (
              <div className="mb-6 w-full p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 text-left">
                {permissionError}
              </div>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={requestPermissions}
              disabled={checkingPermissions}
            >
              {checkingPermissions && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {checkingPermissions ? 'Checking Devices...' : 'Grant Permissions'}
            </Button>

            {isLocalhost && (
              <div className="w-full flex flex-col gap-2 mt-3">
                <Button
                  variant="outline"
                  className="w-full border-dashed border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-100"
                  onClick={() => {
                    toast.success("Bypassing proctoring device checks for development.")
                    setMediaStreamsReady(true)
                    setMobileStreamActive(true)
                    setPermissionsGranted(true)
                  }}
                >
                  Bypass Setup & Start Test (Dev Mode)
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-dashed border-primary text-primary bg-primary/10 hover:bg-primary/20"
                  onClick={() => {
                    toast.success("Mocking desktop hardware. Scan QR code below to pair phone.")
                    setMediaStreamsReady(true)
                  }}
                >
                  Mock Desktop Media & Test QR Flow
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step 2: High Security - Scan QR Code to Link Mobile Feed */}
        {mediaStreamsReady && paper.highSecurity && !mobileStreamActive && (
          <>
            <p className="text-slate-600 text-sm mb-6 text-left">
              <strong>High-Security Mode Active:</strong> Scan the QR code below using your mobile phone camera to link your secondary environment camera.
            </p>

            <div className="w-48 h-48 border bg-slate-100 rounded-lg p-2 mb-6 flex items-center justify-center shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileStreamUrl)}`}
                alt="Scan QR Code to Pair Mobile Feed"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="w-full bg-primary/5 rounded-xl p-3 border border-primary/20 text-primary text-xs mb-6 text-left flex items-start gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 mt-0.5" />
              <div>
                <strong>Waiting for phone pairing...</strong>
                <div className="text-[10px] text-slate-500 mt-0.5">Keep this browser window open while you scan and allow mobile camera access.</div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Identity Verification (Face Check) */}
        {mediaStreamsReady && (!paper.highSecurity || mobileStreamActive) && (
          <>
            <p className="text-slate-600 text-sm mb-6">
              Position yourself clearly in front of the camera and click the verification button below.
            </p>

            <div className="w-64 h-48 rounded-lg overflow-hidden border bg-slate-100 mb-6 shadow-inner relative flex items-center justify-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                onUserMedia={() => setCameraActive(true)}
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                  Connecting camera...
                </div>
              )}
            </div>

            {permissionError && (
              <div className="mb-6 w-full p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 text-left">
                {permissionError}
              </div>
            )}

            {paper.consentRequired && (
              <label className="w-full text-left text-sm text-slate-600 mb-4 flex items-start gap-2">
                <input type="checkbox" checked={consentAccepted} onChange={e => setConsentAccepted(e.target.checked)} className="mt-1" />
                <span>I consent to webcam/screen monitoring, tab switch tracking, and activity logging during this test.</span>
              </label>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={verifyFaceAndStart}
              disabled={checkingPermissions || !cameraActive}
            >
              {checkingPermissions && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {checkingPermissions ? 'Verifying Face...' : 'Verify Face & Start Test'}
            </Button>

            {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
              <Button
                variant="outline"
                className="w-full mt-3 border-dashed border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-100"
                onClick={() => {
                  toast.success("Bypassing face check for development.")
                  setPermissionsGranted(true)
                }}
              >
                Bypass Face Verification & Start (Dev Mode)
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

return (
  <div
    className="h-screen flex flex-col bg-background overflow-hidden select-none"
    onContextMenu={(e) => e.preventDefault()}
    onCopy={(e) => { e.preventDefault(); logViolation('COPY_PASTE', 'Candidate attempted to copy content.'); toast.error("Copying is disabled."); }}
    onCut={(e) => { e.preventDefault(); logViolation('COPY_PASTE', 'Candidate attempted to cut content.'); toast.error("Cutting is disabled."); }}
    onPaste={(e) => { e.preventDefault(); logViolation('COPY_PASTE', 'Candidate attempted to paste content.'); toast.error("Pasting is disabled."); }}
  >
    {/* Header */}
    <header className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-white">
      <div className="flex items-center gap-4">
        {paper.organization && (
          <div className="flex items-center gap-2 border-r pr-4 mr-2">
            {paper.organization.logo ? (
              <img src={paper.organization.logo} alt={paper.organization.name} className="h-6 w-auto rounded" />
            ) : (
              <div className="bg-primary/10 p-1 rounded-md text-primary">
                <Hexagon className="w-4 h-4 fill-current" />
              </div>
            )}
            <span className="font-bold text-sm text-slate-600 hidden sm:inline-block">{paper.organization.name}</span>
          </div>
        )}
        <h1 className="font-bold text-lg md:text-xl text-slate-800">{paper.title}</h1>
      </div>
      <div className={`flex items-center gap-2 font-mono text-lg font-semibold px-4 py-2 rounded-md ${timeLeft < 300 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
        <Clock className="w-5 h-5" />
        {formatTime(timeLeft)}
      </div>
    </header>

    {/* Body container */}
    <div className="flex-1 flex overflow-hidden">

      {/* Left Column - Main Question Area */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto relative">
        {currentQuestion && (
          <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto">

            {/* Question Card */}
            <div className="bg-white border rounded-xl shadow-sm flex-1 flex flex-col">
              {/* Card Header */}
              <div className="flex justify-between items-center p-6 border-b">
                <div className="font-bold text-sm tracking-wider text-primary uppercase">
                  {currentQuestion.sectionTitle}
                </div>
                <div className="text-sm font-medium text-slate-500">
                  Question {currentIdx + 1} of {allQuestions.length}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-lg text-slate-800 mb-8 prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />

                <div className="flex-1">
                  {currentQuestion.questionType === 'MCQ' && currentQuestion.options && (() => {
                    const opts = getParsedOptions(currentQuestion.options)
                    const parsedCfg = getParsedCodeConfig(currentQuestion.options) as any
                    const mcqMode = parsedCfg?.mcqMode || 'single'
                    if (mcqMode === 'multi') {
                      const selected = (answers[currentQuestion.id] || '').split('||').filter(Boolean)
                      return <div className="space-y-3">{opts.map((opt: string, oIdx: number) => <div key={oIdx} className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-slate-50 transition-colors"><Checkbox checked={selected.includes(opt)} onCheckedChange={(v) => { const next = new Set(selected); if (v) next.add(opt); else next.delete(opt); handleAnswer(currentQuestion.id, Array.from(next).join('||')) }} /><Label className="flex-1 cursor-pointer text-base">{opt}</Label></div>)}</div>
                    }
                    return <RadioGroup value={answers[currentQuestion.id] || ''} onValueChange={(val) => handleAnswer(currentQuestion.id, val)} className="space-y-3">{opts.map((opt: string, oIdx: number) => <div key={oIdx} className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-slate-50 transition-colors"><RadioGroupItem value={opt} id={`q-${currentQuestion.id}-opt-${oIdx}`} /><Label htmlFor={`q-${currentQuestion.id}-opt-${oIdx}`} className="flex-1 cursor-pointer text-base">{opt}</Label></div>)}</RadioGroup>
                  })()}

                  {currentQuestion.questionType === 'SA' && (
                    <Textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      placeholder="Type your detailed answer here..."
                      className="w-full resize-none bg-slate-50 focus-visible:bg-white border-slate-200 focus-visible:ring-primary h-[300px]"
                    />
                  )}

                  {currentQuestion.questionType === 'CODE' && (() => {
                    const codeConfig = getParsedCodeConfig(currentQuestion.options);
                    const availableLangs = [
                      { id: 'javascript', label: 'JavaScript' },
                      { id: 'python', label: 'Python' },
                      { id: 'java', label: 'Java' },
                      { id: 'cpp', label: 'C++' },
                      { id: 'go', label: 'Go' },
                      { id: 'typescript', label: 'TypeScript' }
                    ].filter(l => codeConfig.allowedLanguages.includes(l.id));

                    const currentLang = codeLanguages[currentQuestion.id] || (availableLangs.length > 0 ? availableLangs[0].id : 'javascript');

                    // Auto-inject starter code if editor is empty
                    const currentAnswer = answers[currentQuestion.id];
                    const editorValue = currentAnswer !== undefined ? currentAnswer : (codeConfig.starterCode[currentLang] || '');

                    const handleLangSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
                      const newLang = e.target.value;
                      handleLanguageChange(currentQuestion.id, newLang);
                      // If user hasn't written anything (or we want to reset), we can inject starter code.
                      // We will inject starter code if they switch language and haven't written custom code,
                      // but to be safe, let's just let the Editor component re-render with the new starter code if currentAnswer is empty.
                      if (!currentAnswer) {
                        handleAnswer(currentQuestion.id, codeConfig.starterCode[newLang] || '');
                      }
                    };

                    return (
                      <div className="flex flex-col gap-4 h-[500px]">
                        <div className="border rounded-lg overflow-hidden flex flex-col flex-1 min-h-[300px]">
                          <div className="bg-slate-100 border-b px-4 py-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">Code Editor</span>
                            <div className="flex items-center gap-3">
                              <select
                                className="bg-white border text-sm rounded px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                                value={currentLang}
                                onChange={handleLangSelect}
                              >
                                {availableLangs.map(l => (
                                  <option key={l.id} value={l.id}>{l.label}</option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs font-semibold text-slate-600"
                                onClick={() => {
                                  setShowResetModal(true)
                                }}
                                title="Reset to starter code"
                              >
                                <RotateCcw className="w-3 h-3 mr-1.5" />
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-3 bg-primary hover:bg-primary/90 text-xs font-semibold"
                                onClick={() => handleRunCode(currentQuestion.id)}
                                disabled={isExecuting[currentQuestion.id]}
                              >
                                {isExecuting[currentQuestion.id] ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Play className="w-3 h-3 mr-1.5" />}
                                Run Code
                              </Button>
                            </div>
                          </div>
                            <Editor
                              height="100%"
                              language={currentLang}
                              theme="vs-light"
                              value={editorValue}
                              onMount={(editor) => {
                                editor.onDidPaste(() => {
                                  if (currentQuestion?.questionType === 'CODE') {
                                    logViolation('CODE_PASTE', 'Candidate pasted content into the coding editor.')
                                  }
                                })
                                editor.onKeyDown((event) => {
                                  if (!currentQuestion || currentQuestion.questionType !== 'CODE') return
                                  const isCopy = (event.ctrlKey || event.metaKey) && event.keyCode === 33
                                  if (isCopy) {
                                    logViolation('CODE_COPY', 'Candidate copied content from the coding editor.')
                                  }
                                })
                              }}
                              onChange={(val) => {
                        if (!val) {
                          // Restore starter code if user clears editor
                          handleAnswer(currentQuestion.id, codeConfig.starterCode[currentLang] || '');
                              } else {
                                handleAnswer(currentQuestion.id, val);
                              }
                            }}
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              scrollBeyondLastLine: false,
                              ...(codeConfig.disableAutocomplete ? {
                                suggestOnTriggerCharacters: false,
                                quickSuggestions: false,
                                wordBasedSuggestions: "off",
                                parameterHints: { enabled: false },
                                snippetSuggestions: "none",
                              } : {})
                            }}
                          />
                        </div>

                        {/* Terminal Output */}
                        <div className="h-40 bg-[#1e1e1e] rounded-lg border flex flex-col overflow-hidden shrink-0">
                          <div className="bg-[#2d2d2d] px-4 py-1.5 border-b border-[#404040] flex items-center">
                            <span className="text-xs font-mono text-gray-300">Console Output</span>
                          </div>
                          <div className="p-4 font-mono text-sm text-green-400 overflow-y-auto whitespace-pre-wrap flex-1">
                            {(() => {
                              const outputStr = codeOutput[currentQuestion.id];
                              if (!outputStr) return <span className="text-gray-500 italic">Click "Run Code" to see output...</span>;
                              if (outputStr === "Executing...") return <span className="text-blue-400">Executing...</span>;

                              try {
                                const parsed = JSON.parse(outputStr);
                                if (parsed.isTestCases) {
                                  return (
                                    <div className="space-y-4 pb-4">
                                      {parsed.results.map((tc: any, i: number) => (
                                        <div key={i} className={`p-3 border rounded-md ${tc.passed ? 'bg-green-950/30 border-green-800' : 'bg-red-950/30 border-red-800'}`}>
                                          <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                                            {tc.passed ? <span className="text-green-400">✅ Passed</span> : <span className="text-red-400">❌ Failed</span>}
                                            <span className="text-gray-300">Test Case {i + 1}</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                            <div><span className="text-gray-500 block mb-1">Input:</span><pre className="p-2 bg-black rounded border border-gray-800 text-gray-300">{tc.input}</pre></div>
                                            <div><span className="text-gray-500 block mb-1">Expected Output:</span><pre className="p-2 bg-black rounded border border-gray-800 text-gray-300">{tc.expectedOutput}</pre></div>
                                            <div className="col-span-2"><span className="text-gray-500 block mb-1">Your Output:</span><pre className="p-2 bg-black rounded border border-gray-800 text-gray-300">{tc.actualOutput}</pre></div>
                                          </div>
                                        </div>
                                      ))}
                                      {parsed.hiddenCount > 0 && (
                                        <div className="text-sm text-gray-500 italic mt-2 text-center pt-2 border-t border-zinc-800">
                                          + {parsed.hiddenCount} hidden test {parsed.hiddenCount === 1 ? 'case' : 'cases'} used for final grading.
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // Not JSON, just normal text error or raw output
                              }

                              return <span className={outputStr.includes('Error') ? 'text-red-400' : 'text-green-400'}>{outputStr}</span>;
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t flex justify-between items-center bg-slate-50 rounded-b-xl">
                <Button
                  variant={marked.has(currentQuestion.id) ? 'secondary' : 'outline'}
                  onClick={toggleMarkForReview}
                  className={marked.has(currentQuestion.id) ? 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200' : 'text-slate-600'}
                >
                  {marked.has(currentQuestion.id) ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
                  {marked.has(currentQuestion.id) ? 'Marked for review' : 'Mark for review'}
                </Button>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevQuestion} disabled={currentIdx === 0}>
                    Previous
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90 text-white min-w-[100px]" onClick={nextQuestion} disabled={currentIdx === allQuestions.length - 1}>
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {/* Proctoring Active Badge */}
            <div className="mt-4 flex justify-between items-center">
              <div className="inline-flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs font-bold tracking-wider text-slate-500 bg-white">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                AI PROCTORING ACTIVE
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Right Column - Sidebar */}
      <div className="w-80 border-l bg-slate-50/50 flex flex-col shrink-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Question Grid By Section */}
          {paper.sections.map((section: any) => {
            // Find the start index of this section's questions in the flat array
            const sectionQuestions = allQuestions.map((q, i) => ({ q, i })).filter(item => item.q.sectionId === section.id);

            if (sectionQuestions.length === 0) return null;

            return (
              <div key={section.id}>
                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-800 mb-4">{section.title}</h3>
                <div className="grid grid-cols-5 gap-2">
                  {sectionQuestions.map(({ q, i }) => {
                    const status = getQuestionStatus(q, i);
                    return (
                      <button
                        key={q.id}
                        onClick={() => jumpToQuestion(i)}
                        className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium border transition-colors ${getStatusColor(status)}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend Bottom */}
        <div className="p-6 border-t bg-white">
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-800 mb-4">Legend</h3>
          <div className="space-y-2.5 text-sm font-medium text-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-primary"></div> Answered</div>
              <div className="bg-slate-100 px-2 py-0.5 rounded text-xs">{statAnswered}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-red-500"></div> Not Answered</div>
              <div className="bg-slate-100 px-2 py-0.5 rounded text-xs">{statNotAnswered}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-slate-200 border"></div> Not Visited</div>
              <div className="bg-slate-100 px-2 py-0.5 rounded text-xs">{statNotVisited}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-amber-500"></div> Marked for Review</div>
              <div className="bg-slate-100 px-2 py-0.5 rounded text-xs">{statMarked}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-primary ring-2 ring-primary/30"></div> Current</div>
              <div className="bg-slate-100 px-2 py-0.5 rounded text-xs">1</div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-white text-base shadow-sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Test
          </Button>
        </div>
      </div>

    </div>

    {isFullscreenLocked && (
      <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold mb-2">Lockdown Overlay</h2>
        <p className="text-slate-400 max-w-md mb-6">
          You have exited Fullscreen mode. High-Security settings require permanent Fullscreen mode during the test.
        </p>
        <Button size="lg" className="bg-primary text-white" onClick={reEnterFullscreen}>
          Re-enter Fullscreen
        </Button>
      </div>
    )}

    {/* Hidden Webcam */}
    <div className="opacity-0 absolute -z-10 w-1 h-1 overflow-hidden pointer-events-none">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        onUserMedia={() => setCameraActive(true)}
      />
    </div>

    {/* Reset Editor Dialog */}
    <AlertDialog open={showResetModal} onOpenChange={setShowResetModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Editor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reset the editor? This will erase your current code and restore the starter code. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            const codeConfig = typeof currentQuestion?.options === 'string'
              ? JSON.parse(currentQuestion.options)
              : (currentQuestion?.options || { allowedLanguages: ['javascript', 'python', 'java', 'cpp', 'go', 'typescript'] });
            const availableLangs = [
              { id: 'javascript', label: 'JavaScript' },
              { id: 'python', label: 'Python' },
              { id: 'java', label: 'Java' },
              { id: 'cpp', label: 'C++' },
              { id: 'go', label: 'Go' },
              { id: 'typescript', label: 'TypeScript' }
            ].filter(l => codeConfig.allowedLanguages.includes(l.id));

            const currentLang = codeLanguages[currentQuestion.id] || (availableLangs.length > 0 ? availableLangs[0].id : 'javascript');
            const initialCode = currentQuestion?.options?.starterCode?.[currentLang] || '';
            handleAnswer(currentQuestion.id, initialCode);
            setShowResetModal(false);
          }}>
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
)
}
