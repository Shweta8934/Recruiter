'use client'

import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { useSubscription } from '@/hooks/useSubscription'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Mail,
  CreditCard,
  Sparkles,
  Settings,
  BarChart3,
  Briefcase,
  UserCheck,
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Code,
  Layout,
  Building,
  ClipboardList,
  Workflow,
  FilePlus,
  FileText,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Mail,
  CreditCard,
  Sparkles,
  Settings,
  BarChart3,
  Briefcase,
  UserCheck,
  Calendar,
  Receipt,
  Code,
  Layout,
  Building,
  ClipboardList,
  Workflow,
  FilePlus,
  FileText,
  BookOpen
}

export function AppSidebar() {
  const { user } = useAuth()
  const { sidebarItems } = usePermission()
  const { currentPlan } = useSubscription()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1050
      setIsMobile(mobile)
      if (mobile) {
        setCollapsed(true)
      } else {
        setCollapsed(false)
      }
    }

    handleResize() // check on mount
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-collapse sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
    }
  }, [pathname, isMobile])

  if (!user) return null

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 z-50',
          collapsed ? 'w-16' : 'w-64 fixed md:static h-full'
        )}
      >
        {/* Logo / Brand */}
        <div className={cn("flex h-16 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 font-semibold overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full btn-gradient text-white">
                {APP_NAME.charAt(0)}
              </div>
              <span className="truncate">{APP_NAME}</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Plan Badge */}
        {currentPlan && !collapsed && (
          <div className="border-b border-sidebar-border px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>{currentPlan.name} Plan</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <ul className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard

              // Construct tenant-aware href
              const isSuperAdmin = user.roleSlug === 'super-admin'
              const hasSlug = user.organizationSlug && item.href.includes(`/organization/${user.organizationSlug}`)
              const shouldPrefix = user.organizationSlug && !isSuperAdmin && !hasSlug && !item.href.startsWith('/super-admin')
              const tenantHref = shouldPrefix
                ? `/organization/${user.organizationSlug}${item.href}`
                : item.href

              const isActive = pathname === tenantHref || pathname.startsWith(`${tenantHref}/`)

              return (
                <li key={item.href}>
                  <Link
                    href={tenantHref}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

      </aside>
    </>
  )
}
