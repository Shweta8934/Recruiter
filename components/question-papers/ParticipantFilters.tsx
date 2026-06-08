'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ParticipantFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-4">
      <Select value={searchParams.get('status') || 'all'} onValueChange={(val) => handleFilterChange('status', val)}>
        <SelectTrigger className="w-[150px] bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pass">Pass</SelectItem>
          <SelectItem value="fail">Fail</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Select value={searchParams.get('shortlist') || 'all'} onValueChange={(val) => handleFilterChange('shortlist', val)}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Shortlist Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Shortlist</SelectItem>
          <SelectItem value="yes">Shortlisted</SelectItem>
          <SelectItem value="no">Not Shortlisted</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
