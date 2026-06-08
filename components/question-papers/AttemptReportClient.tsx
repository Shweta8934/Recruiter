'use client'

import { Loader2 } from 'lucide-react'

export function AttemptReportClient({ attemptId, paperId }: { attemptId: string, paperId: string }) {
  void attemptId
  void paperId

  return (
    <div className="flex flex-col items-center justify-center p-20 text-muted-foreground bg-card border rounded-xl shadow-sm">
      <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Evaluation In Progress</h2>
      <p>Responses are being evaluated in background from submit-time. Please refresh after a few seconds.</p>
    </div>
  )
}
