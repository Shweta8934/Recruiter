'use client'

import { ReactNode, CSSProperties } from 'react'
import { hexToHSL } from '@/lib/utils'

interface ThemeProviderClientProps {
  children: ReactNode
  hexColor?: string | null
  className?: string
}

export function ThemeProviderClient({ children, hexColor, className }: ThemeProviderClientProps) {
  let style: CSSProperties = {}

  if (hexColor) {
    const hslValue = hexToHSL(hexColor)
    style = {
      '--primary': `hsl(${hslValue})`,
      '--ring': `hsl(${hslValue})`,
    } as React.CSSProperties
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
