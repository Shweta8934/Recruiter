'use client'

import { useState, useRef, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { X, Search, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface SkillTagInputProps {
  organizationId: string
  value: string[] // Array of skill strings
  onChange: (skills: string[]) => void
}

export function SkillTagInput({ organizationId, value, onChange }: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<{id: string, name: string, prettyName: string}[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const debouncedSearch = useDebounce(inputValue, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const dispatch = useDispatch()

  useEffect(() => {
    if (!debouncedSearch || !organizationId) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    dispatch(questionPapersActions.searchSkillsRequest({
      organizationId,
      q: debouncedSearch,
      resolve: (skills: any[]) => {
        setSuggestions(skills)
        setIsOpen(true)
        setIsLoading(false)
      },
      reject: () => {
        setIsLoading(false)
      }
    }))
  }, [debouncedSearch, organizationId, dispatch])

  const addSkill = (skill: string) => {
    if (skill && !value.includes(skill)) {
      onChange([...value, skill])
    }
    setInputValue('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const removeSkill = (skillToRemove: string) => {
    onChange(value.filter(s => s !== skillToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue) {
        addSkill(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeSkill(value[value.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((skill) => (
          <Badge key={skill} variant="secondary" className="px-2 py-1 flex items-center gap-1">
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill and press Enter..."
          className="pl-9"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md">
            <ul className="max-h-60 overflow-auto py-1">
              {suggestions.map((skill) => (
                <li
                  key={skill.id}
                  className="px-4 py-2 hover:bg-muted cursor-pointer text-sm"
                  onClick={() => addSkill(skill.prettyName || skill.name)}
                >
                  {skill.prettyName || skill.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
