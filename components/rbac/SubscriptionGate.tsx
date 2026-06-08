'use client'

import { useSubscription } from '@/hooks/useSubscription'
import type { PlanLimits } from '@/types/subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface SubscriptionGateProps {
  feature: keyof PlanLimits
  children: ReactNode
  fallback?: ReactNode
}

export function SubscriptionGate({
  feature,
  children,
  fallback,
}: SubscriptionGateProps) {
  const { hasFeature, currentPlan } = useSubscription()

  if (!hasFeature(feature)) {
    if (fallback) return <>{fallback}</>
    
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Feature Locked</CardTitle>
          <CardDescription>
            This feature is not available on your current plan ({currentPlan?.name || 'Free'}).
            Upgrade to unlock this feature.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/pricing">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              View Plans
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}

interface LimitGateProps {
  canPerform: boolean
  limitName: string
  children: ReactNode
  onUpgrade?: () => void
}

export function LimitGate({
  canPerform,
  limitName,
  children,
  onUpgrade,
}: LimitGateProps) {
  if (!canPerform) {
    return (
      <Card className="border-dashed border-amber-300 bg-amber-50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">Limit Reached</p>
              <p className="text-sm text-amber-700">
                You have reached your {limitName} limit.
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              Upgrade
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
