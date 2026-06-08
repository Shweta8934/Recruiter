import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, PLAN_COLORS } from '@/lib/constants'

interface RoleBadgeProps {
  role: string | { name?: string | null }
  size?: 'sm' | 'md'
  className?: string
}

export function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  const roleName = typeof role === 'string' ? role : role?.name || 'Member'
  const colors: Record<string, string> = {
    'Super Admin': 'bg-amber-100 text-amber-800 border-amber-200',
    'Organization Admin': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'HR': 'bg-pink-100 text-pink-800 border-pink-200',
    'Recruiter': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Developer': 'bg-primary/10 text-primary border-primary/20',
    'Billing Manager': 'bg-purple-100 text-purple-800 border-purple-200',
    'Member': 'bg-gray-100 text-gray-800 border-gray-200',
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        colors[roleName] || 'bg-gray-100 text-gray-800',
        size === 'sm' ? 'px-1.5 py-0 text-xs' : '',
        className
      )}
    >
      {roleName}
    </Badge>
  )
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'

  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

interface PlanBadgeProps {
  plan: string
  className?: string
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const slug = plan.toLowerCase()
  const colorClass = PLAN_COLORS[slug as keyof typeof PLAN_COLORS] || 'bg-gray-100 text-gray-800'

  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      {plan}
    </Badge>
  )
}
