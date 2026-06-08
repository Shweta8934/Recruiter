import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({ currentPage, totalPages, onPageChange, disabled }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || disabled}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Simple pagination numbers - could be expanded for complex ellipis logic */}
        <div className="flex space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            // Logic to show 5 surrounding pages
            let start = Math.max(1, currentPage - 2)
            let end = Math.min(totalPages, start + 4)
            if (end - start < 4) {
              start = Math.max(1, end - 4)
            }
            const page = start + i
            if (page > totalPages) return null
            
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(page)}
                disabled={disabled}
              >
                {page}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || disabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || disabled}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
