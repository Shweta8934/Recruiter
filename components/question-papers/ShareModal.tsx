'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  paperId: string
  title: string
  initialIsPublic: boolean
  onStatusChange?: (newStatus: boolean) => void
}

export function ShareModal({ isOpen, onClose, paperId, title, initialIsPublic, onStatusChange }: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [isUpdating, setIsUpdating] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/question-papers/take/${paperId}`

  const dispatch = useDispatch()

  const handleToggle = (checked: boolean) => {
    setIsUpdating(true)
    dispatch(questionPapersActions.togglePublicRequest({
      paperId,
      resolve: (data) => {
        setIsPublic(data.isPublicActive)
        onStatusChange?.(data.isPublicActive)
        toast.success(data.isPublicActive ? 'Public link activated' : 'Public link deactivated')
        setIsUpdating(false)
      },
      reject: () => {
        toast.error('Failed to update link status')
        setIsUpdating(false)
      }
    }))
  }

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true)
        toast.success('Link copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        toast.error('Failed to copy link')
      })
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        toast.success('Link copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        toast.error('Failed to copy link')
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Assessment Link</DialogTitle>
          <DialogDescription>
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between space-x-2 border rounded-lg p-4">
            <div className="flex flex-col space-y-1">
              <Label className="text-base">Accepting Responses</Label>
              <span className="text-sm text-muted-foreground">
                Candidates can access the test using the link
              </span>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={handleToggle}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label>Public Link</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  readOnly
                  value={shareUrl}
                  className="pl-9 bg-muted/50"
                  disabled={!isPublic}
                />
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleCopy}
                disabled={!isPublic}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {!isPublic && (
              <p className="text-sm text-amber-600 mt-2">
                Enable responses to allow candidates to use this link.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
