'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Bold, Italic, List, ListOrdered, Heading2, Loader2, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  // AI Feature props
  onGenerateAI?: () => Promise<string>
  error?: string
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Write something...', 
  minHeight = '200px',
  onGenerateAI,
  error
}: RichTextEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[${minHeight}] p-4`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Update editor content if value changes externally (e.g. AI generation)
  // But prevent cursor jumping by checking if the content is actually different
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  const handleGenerateAI = async () => {
    if (!onGenerateAI) return
    setIsGenerating(true)
    try {
      const generatedHtml = await onGenerateAI()
      editor?.commands.setContent(generatedHtml)
      onChange(generatedHtml)
      toast.success("Job description generated successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate job description.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className="space-y-1">
      <div className={`border rounded-md overflow-hidden bg-white flex flex-col ${error ? "border-destructive focus-within:ring-1 focus-within:ring-destructive" : "focus-within:ring-1 focus-within:ring-ring focus-within:border-primary"}`}>
        <div className="bg-slate-50 border-b p-2 flex items-center flex-wrap gap-1 sticky top-0 z-10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-slate-200' : ''}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-slate-300 mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`h-8 px-2 text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}`}
          >
            <Heading2 className="h-4 w-4 mr-1" />
            H2
          </Button>
          
          <div className="w-px h-6 bg-slate-300 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-slate-200' : ''}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-slate-200' : ''}`}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          {onGenerateAI && (
            <div className="ml-auto flex items-center">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="bg-[#4370FF] hover:bg-[#355ee2] text-white h-8"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'AI Generate JD'}
              </Button>
            </div>
          )}
        </div>

        <div className={`flex-1 min-h-[${minHeight}] cursor-text`} onClick={() => editor.chain().focus().run()}>
          <EditorContent editor={editor} />
        </div>
        <style jsx global>{`
          .ProseMirror p.is-editor-empty:first-child::before {
            color: #94a3b8;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
