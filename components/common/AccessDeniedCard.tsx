"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldX, ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'

interface AccessDeniedCardProps {
  title?: string
  description?: string
  showHomeButton?: boolean
  showBackButton?: boolean
}

export function AccessDeniedCard({
  title = 'Access Denied',
  description = 'You do not have permission to view this page. Contact your administrator if you believe this is an error.',
  showHomeButton = true,
  showBackButton = true,
}: AccessDeniedCardProps) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldX className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-3">
        {showBackButton && (
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        )}
        {showHomeButton && (
          <Link href="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
