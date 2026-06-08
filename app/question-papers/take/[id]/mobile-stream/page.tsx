'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import Webcam from 'react-webcam'
import { ShieldCheck, Video, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'

export default function MobileStreamPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const dispatch = useDispatch()
  const paperId = params.id as string
  const attemptId = searchParams.get('attemptId')

  const webcamRef = useRef<Webcam>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null)

  // Start uploading snapshots automatically every 10 seconds once camera is active
  useEffect(() => {
    if (!cameraActive || !attemptId || !paperId) return

    const uploadSnapshot = () => {
      if (!webcamRef.current) return
      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) return

      setIsUploading(true)
      dispatch(questionPapersActions.autosaveAttemptRequest({
        paperId,
        attemptId,
        payload: { image: imageSrc }
      }))
      setLastUploadTime(new Date())
      setIsUploading(false)
    }

    // Capture immediately on start
    uploadSnapshot()

    const interval = setInterval(uploadSnapshot, 10000)
    return () => clearInterval(interval)
  }, [cameraActive, attemptId, paperId, dispatch])

  const handleUserMediaError = (err: string | DOMException) => {
    setPermissionError(
      'Could not access the mobile camera. Please ensure camera permissions are allowed in your browser settings and try again.'
    )
  }

  if (!attemptId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-xl font-bold">Invalid Stream URL</h1>
        <p className="text-slate-400 mt-2">Attempt ID is missing. Please scan the QR code displayed on your test screen.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 flex flex-col items-center">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Environmental Feed</h1>
            <p className="text-xs text-slate-400">Linked Secondary Camera</p>
          </div>
        </div>

        {/* Live Video Feed Container */}
        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-700 relative shadow-inner mb-6 flex items-center justify-center">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            onUserMedia={() => setCameraActive(true)}
            onUserMediaError={handleUserMediaError}
          />
          {!cameraActive && !permissionError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm">Configuring phone camera...</span>
            </div>
          )}
          {permissionError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-red-400">
              <AlertCircle className="w-10 h-10 mb-2" />
              <span className="text-sm font-semibold">{permissionError}</span>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {cameraActive && (
          <div className="w-full bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-6 text-center flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isUploading ? 'bg-amber-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-sm font-semibold text-slate-200">
                {isUploading ? 'Uploading environment capture...' : 'Monitoring Active'}
              </span>
            </div>
            {lastUploadTime && (
              <span className="text-[10px] text-slate-500">
                Last sync: {lastUploadTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Instruction Card */}
        <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 flex gap-3 text-left">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 leading-relaxed">
            <h4 className="font-semibold text-slate-200 mb-1">How to place your phone:</h4>
            Place your phone on the side of your workspace (e.g. leaning against a laptop, book, or stand). The camera should capture a side-view of your hands, keyboard, and monitor environment.
          </div>
        </div>

      </div>
    </div>
  )
}
