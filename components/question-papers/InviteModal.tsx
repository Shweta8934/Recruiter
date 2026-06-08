'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  paperId: string
  title: string
}

export function InviteModal({ isOpen, onClose, paperId, title }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)

  const dispatch = useDispatch()

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSending(true)
    dispatch(questionPapersActions.inviteCandidateRequest({
      paperId,
      payload: { email },
      resolve: () => {
        toast.success('Invitation sent successfully')
        setEmail('')
        onClose()
        setIsSending(false)
      },
      reject: () => {
        toast.error('Failed to send invitation')
        setIsSending(false)
      }
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSend}>
          <DialogHeader>
            <DialogTitle>Invite Candidate</DialogTitle>
            <DialogDescription>
              Send an email invitation for the <strong>{title}</strong> assessment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Candidate Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="candidate@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!email || isSending}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
