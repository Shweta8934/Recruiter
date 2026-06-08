'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface SkillBadgeListProps {
  skills: string[]
  maxVisible?: number
}

export function SkillBadgeList({ skills, maxVisible = 5 }: SkillBadgeListProps) {
  const [expanded, setExpanded] = useState(false)

  if (!skills || skills.length === 0) return null

  const visibleSkills = expanded ? skills : skills.slice(0, maxVisible)
  const remainingCount = skills.length - maxVisible

  return (
    <div className="flex gap-1 flex-wrap">
      {visibleSkills.map((s, idx) => (
        <Badge key={idx} variant="secondary">
          {s}
        </Badge>
      ))}
      {!expanded && remainingCount > 0 && (
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-secondary"
          onClick={() => setExpanded(true)}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  )
}
