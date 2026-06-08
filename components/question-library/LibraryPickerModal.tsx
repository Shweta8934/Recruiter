'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchJson } from '@/lib/apiClient'
import { toast } from 'sonner'
import { Search, Code2, FileQuestion, AlignLeft, Loader2 } from 'lucide-react'

interface LibraryQuestion {
  id: string
  text: string
  questionType: string
  skills: string[]
  difficulty: number
  options?: string[] | null
  answer: string
  testCases?: any
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  MCQ:  <FileQuestion className="h-3.5 w-3.5 text-primary shrink-0" />,
  SA:   <AlignLeft className="h-3.5 w-3.5 text-indigo-500 shrink-0" />,
  CODE: <Code2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />,
}

const DIFF_LABELS: Record<number, string> = { 1: 'Beginner', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert' }

export function LibraryPickerModal({
  isOpen,
  onClose,
  organizationId,
  onAdd,
}: {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  onAdd: (questions: LibraryQuestion[]) => void
}) {
  const [questions, setQuestions] = useState<LibraryQuestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDiff, setFilterDiff] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchLibrary = useCallback(async () => {
    if (!organizationId) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ organizationId, status: 'published' })
      if (filterType !== 'all') params.set('type', filterType)
      if (filterDiff !== 'all') params.set('difficulty', filterDiff)
      const data = await fetchJson(`/api/library-questions?${params}`)
      setQuestions(data.libraryQuestions || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load library')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, filterType, filterDiff])

  useEffect(() => {
    if (isOpen) {
      fetchLibrary()
      setSelected(new Set())
    }
  }, [isOpen, fetchLibrary])

  const filtered = questions.filter(q =>
    q.text.toLowerCase().includes(search.toLowerCase()) ||
    q.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    const toAdd = questions.filter(q => selected.has(q.id))
    onAdd(toAdd)
    setSelected(new Set())
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Questions from Library</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search by text or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="MCQ">MCQ</SelectItem>
              <SelectItem value="SA">Short Answer</SelectItem>
              <SelectItem value="CODE">Coding</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDiff} onValueChange={setFilterDiff}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {[1,2,3,4,5].map(v => <SelectItem key={v} value={String(v)}>L{v} – {DIFF_LABELS[v]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
              No questions found in library.
            </div>
          ) : filtered.map(q => (
            <div
              key={q.id}
              onClick={() => toggle(q.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(q.id) ? 'border-primary/60 bg-primary/5' : 'border-border hover:bg-muted/40'}`}
            >
              <Checkbox checked={selected.has(q.id)} className="mt-0.5" onCheckedChange={() => toggle(q.id)} onClick={e => e.stopPropagation()} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {TYPE_ICONS[q.questionType]}
                  <span className="text-xs font-medium text-muted-foreground">{q.questionType}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">L{q.difficulty} {DIFF_LABELS[q.difficulty]}</span>
                </div>
                <p className="text-sm line-clamp-2" dangerouslySetInnerHTML={{ __html: q.text }} />
                <div className="flex flex-wrap gap-1 mt-1">
                  {q.skills.slice(0, 4).map(sk => (
                    <Badge key={sk} variant="secondary" className="text-xs py-0 px-1.5">{sk}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="border-t pt-3">
          <span className="text-sm text-muted-foreground mr-auto">{selected.size} selected</span>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            Add {selected.size > 0 ? `${selected.size} ` : ''}Question{selected.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
