'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { fetchJson } from '@/lib/apiClient'
import { Pencil, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react'

const OVERRIDE_ROLES = ['org-admin', 'hr', 'recruiter', 'super-admin']

interface AttemptLike {
  id: string
  score: number | null
  originalScore?: number | null
  isScoreOverridden?: boolean
  manualOverrideReason?: string | null
}

export function ScoreOverrideCard({
  attempt,
  paperId,
  cutoffScore,
}: {
  attempt: AttemptLike
  paperId: string
  cutoffScore: number
}) {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newScore, setNewScore] = useState(String(attempt.score || 0))
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentScore, setCurrentScore] = useState<number | null>(attempt.score)
  const [isOverridden, setIsOverridden] = useState(attempt.isScoreOverridden || false)
  const [overrideReason, setOverrideReason] = useState(attempt.manualOverrideReason || '')

  const canOverride = user?.roleSlug && OVERRIDE_ROLES.includes(user.roleSlug)
  const score = currentScore ?? 0
  const passed = score >= cutoffScore

  const handleOverride = async () => {
    const parsed = parseInt(newScore)
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error('Score must be between 0 and 100.')
      return
    }
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('Please provide a reason (min 5 characters).')
      return
    }
    if (!user?.organizationId) return

    setIsSaving(true)
    try {
      await fetchJson(`/api/question-papers/${paperId}/attempts/${attempt.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: user.organizationId, newScore: parsed, reason: reason.trim() }),
      })
      setCurrentScore(parsed)
      setIsOverridden(true)
      setOverrideReason(reason.trim())
      toast.success('Score overridden successfully. Audit log saved.')
      setIsDialogOpen(false)
      setReason('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to override score')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="bg-card border rounded-xl p-6 shadow-sm text-center">
        <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-2">Final Score</div>

        {/* Score Display */}
        <div className="text-5xl font-bold text-primary mb-2">{score}%</div>
        <Badge variant={passed ? 'default' : 'destructive'} className="text-sm">
          {passed ? 'PASSED' : 'FAILED'} (Cutoff: {cutoffScore}%)
        </Badge>

        {/* Original Score — shown if overridden */}
        {isOverridden && attempt.originalScore !== null && attempt.originalScore !== undefined && (
          <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2 text-left">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-semibold">Score manually overridden.</span>
              <br />Original machine score: <span className="font-semibold">{attempt.originalScore}%</span>
              {overrideReason && <><br />Reason: {overrideReason}</>}
            </div>
          </div>
        )}

        {/* Override Button */}
        {canOverride && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full text-xs"
            onClick={() => { setNewScore(String(score)); setIsDialogOpen(true) }}
          >
            <Pencil className="h-3 w-3 mr-1.5" />
            {isOverridden ? 'Change Override' : 'Manual Override'}
          </Button>
        )}
      </div>

      {/* Override Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Manual Score Override</DialogTitle>
            <DialogDescription>
              Override the machine-evaluated score. This action is logged in the audit trail and cannot be hidden.
              Original score: <strong>{attempt.originalScore ?? score}%</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Score (0-100) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newScore}
                onChange={e => setNewScore(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Override <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Explain why you are changing the score (e.g. 'Candidate used correct logic but wrong syntax. Partial credit given.')"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleOverride} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Apply Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
