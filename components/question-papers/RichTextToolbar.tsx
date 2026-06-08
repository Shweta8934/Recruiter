'use client'

import { Bold, Italic, Underline, List, ListOrdered, Image as ImageIcon, Code, Upload } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { toast } from 'sonner'

interface RichTextToolbarProps {
  onFormat: (command: string, value?: string) => void
  onImageUpload: (file: File) => Promise<string | null>
  onToggleCodeSnippet?: () => void
}

export function RichTextToolbar({ onFormat, onImageUpload, onToggleCodeSnippet }: RichTextToolbarProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFormat = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault()
    onFormat(command, value)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const url = await onImageUpload(file)
      if (url) {
        onFormat('insertImage', url)
      } else {
        toast.error('Image upload failed')
      }
    } catch (error) {
      toast.error('Image upload failed')
    } finally {
      setIsUploading(false)
      // reset file input
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-md border border-border/50">
      <Toggle size="sm" className="h-8 w-8 p-0" onMouseDown={(e) => handleFormat(e, 'bold')} title="Bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" className="h-8 w-8 p-0" onMouseDown={(e) => handleFormat(e, 'italic')} title="Italic">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" className="h-8 w-8 p-0" onMouseDown={(e) => handleFormat(e, 'underline')} title="Underline">
        <Underline className="h-4 w-4" />
      </Toggle>

      <div className="w-[1px] h-4 bg-border mx-1" />

      <label className={`cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-8 px-2 py-1 ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:bg-accent hover:text-accent-foreground'}`}>
        {isUploading ? <Upload className="h-4 w-4 animate-bounce" /> : <ImageIcon className="h-4 w-4" />}
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>

      <Button variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(e) => handleFormat(e, 'insertUnorderedList')} title="Bullet List">
        <List className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(e) => handleFormat(e, 'insertOrderedList')} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(e) => { e.preventDefault(); onToggleCodeSnippet?.(); }} title="Code Snippet">
        <Code className="h-4 w-4" />
      </Button>
    </div>
  )
}
