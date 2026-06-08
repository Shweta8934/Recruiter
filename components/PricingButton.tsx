'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface PricingButtonProps {
  slug: string
  features: {
    highlight?: boolean
    cta: string
  }
  isEnterprise: boolean
}

export function PricingButton({ slug, features, isEnterprise }: PricingButtonProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isEnterprise) {
      router.push('/contact')
      return
    }
    
    const targetUrl = `/subscription?plan=${slug}`
    if (isAuthenticated) {
      router.push(targetUrl)
    } else {
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`mt-6 block text-center w-full rounded-full px-4 py-2 text-sm font-semibold ${
        features.highlight
          ? 'bg-[#4370FF] text-white hover:bg-[#355ee2]'
          : 'border border-slate-300 bg-white hover:bg-slate-100'
      }`}
    >
      {features.cta}
    </button>
  )
}
