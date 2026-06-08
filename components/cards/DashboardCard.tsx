import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface DashboardCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

export function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: DashboardCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/5 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn(
            'text-xs mt-1',
            trend.positive ? 'text-emerald-600' : 'text-red-600'
          )}>
            {trend.positive ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
