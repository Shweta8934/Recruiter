'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
}

export function BackButton({ href, label, className }: BackButtonProps) {
  const router = useRouter()
  
  const content = (
    <>
      <ArrowLeft className="h-4 w-4" />
      {label && <span className="ml-2">{label}</span>}
    </>
  )

  if (href) {
    return (
      <Button variant="ghost" size={label ? "default" : "icon"} asChild type="button" className={`shrink-0 ${className || ''}`}>
        <Link href={href}>{content}</Link>
      </Button>
    )
  }

  return (
    <Button variant="ghost" size={label ? "default" : "icon"} type="button" onClick={() => router.back()} className={`shrink-0 ${className || ''}`}>
      {content}
    </Button>
  )
}
