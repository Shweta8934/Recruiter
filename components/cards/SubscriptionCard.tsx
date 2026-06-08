import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { calculateUsagePercentage } from '@/lib/subscription'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface UsageCardProps {
  title: string
  used: number
  limit: number
  unit?: string
  className?: string
}

export function UsageCard({
  title,
  used,
  limit,
  unit = '',
  className,
}: UsageCardProps) {
  const percentage = calculateUsagePercentage(used, limit)
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100
  const isUnlimited = limit >= 9999

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {isNearLimit && !isUnlimited && (
            <AlertTriangle className={cn(
              'h-4 w-4',
              isAtLimit ? 'text-red-500' : 'text-amber-500'
            )} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{used.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">
            / {isUnlimited ? 'Unlimited' : `${limit.toLocaleString()} ${unit}`}
          </span>
        </div>
        {!isUnlimited && (
          <Progress 
            value={percentage} 
            className={cn(
              'mt-3 h-2',
              isAtLimit && '[&>div]:bg-red-500',
              isNearLimit && !isAtLimit && '[&>div]:bg-amber-500'
            )} 
          />
        )}
        {isNearLimit && !isUnlimited && (
          <p className={cn(
            'mt-2 text-xs',
            isAtLimit ? 'text-red-600' : 'text-amber-600'
          )}>
            {isAtLimit ? 'Limit reached' : `${100 - percentage}% remaining`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface SubscriptionCardProps {
  planName: string
  price: number
  billingCycle: string
  renewalDate?: string
  features: string[]
  onUpgrade?: () => void
  onManage?: () => void
  isCurrent?: boolean
  className?: string
}

export function SubscriptionCard({
  planName,
  price,
  billingCycle,
  renewalDate,
  features = [],
  onUpgrade,
  onManage,
  isCurrent,
  className,
}: SubscriptionCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{planName}</CardTitle>
            <CardDescription>
              ${price}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
            </CardDescription>
          </div>
          {isCurrent && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Current Plan
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {features.slice(0, 4).map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
        {renewalDate && (
          <p className="mt-4 text-xs text-muted-foreground">
            Renews on {new Date(renewalDate).toLocaleDateString()}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          {onManage && (
            <Button variant="outline" size="sm" onClick={onManage} className="flex-1">
              Manage
            </Button>
          )}
          {onUpgrade && (
            <Button size="sm" onClick={onUpgrade} className="flex-1">
              Upgrade <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
