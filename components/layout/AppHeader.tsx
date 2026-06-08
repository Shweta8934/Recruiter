'use client'

import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { useRouter, usePathname } from 'next/navigation'
import { getDashboardRouteForRole } from '@/lib/routes'
import { useDispatch } from 'react-redux'
import { authActions } from '@/store/slices/authSlice'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Bell, LogOut, Settings, User, Building2, MonitorOff } from 'lucide-react'

export function AppHeader() {
  const { user, logout } = useAuth()
  const { isSuperAdmin } = usePermission()
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch()

  if (!user) return null

  const [activeOrg, setActiveOrg] = useState<any>(null)
  const roleName = (user as any).roleSlug?.replace('-', ' ') || 'Member'

  useEffect(() => {
    function syncActiveOrgFromMembership() {
      let currentSlug: string | null = null
      if (pathname && pathname.startsWith('/organization/')) {
        const parts = pathname.split('/')
        if (parts.length > 2 && parts[2]) {
          currentSlug = parts[2]
        }
      }

      const memberships = user?.memberships || []
      const activeMembership =
        (currentSlug && memberships.find((m: any) => m.organizationSlug === currentSlug)) ||
        memberships.find((m: any) => m.organizationId === user?.organizationId) ||
        memberships[0]

      if (!activeMembership) {
        setActiveOrg(null)
        return
      }

      setActiveOrg({
        id: activeMembership.organizationId,
        name: activeMembership.organizationName,
        logo: activeMembership.organizationLogo,
      })
    }
    syncActiveOrgFromMembership()
  }, [user?.organizationId, pathname, user?.memberships])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleLogoutAll = async () => {
    dispatch(authActions.logoutAllRequest({
      resolve: () => {
        logout()
        router.push('/login')
      }
    }))
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header
      className="flex h-16 items-center justify-between border-b border-border bg-background px-6 transition-colors duration-300"
      style={{
        borderTop: (!isSuperAdmin && activeOrg?.primaryColor && activeOrg.primaryColor !== '#000000')
          ? `4px solid ${activeOrg.primaryColor}`
          : undefined
      }}
    >
      {/* Left side - Organization info */}
      <div className="flex items-center gap-4">
        {!isSuperAdmin && activeOrg?.name && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />

            {/* 
            {user.memberships && user.memberships.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto p-0 px-2 hover:bg-transparent font-medium text-sm flex items-center gap-2">
                    {activeOrg.name}
                    <span className="text-xs text-muted-foreground opacity-50">▼</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.memberships?.map((membership: any) => {
                    const isActive = activeOrg ? membership.organizationId === activeOrg.id : membership.organizationId === user.organizationId;
                    return (
                      <DropdownMenuItem
                        key={membership.organizationId}
                        className={isActive ? "bg-muted" : "cursor-pointer"}
                        onClick={(e) => {
                          e.preventDefault()
                          if (isActive) return
                          
                          if (membership.organizationSlug) {
                            const roleSlug = membership.role
                            const targetBaseRoute = getDashboardRouteForRole(roleSlug)
                            window.location.href = `/organization/${membership.organizationSlug}${targetBaseRoute}`
                          } else {
                            window.location.href = '/organization/dashboard'
                          }
                        }}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        {membership.organizationName}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-sm font-medium">{activeOrg?.name}</span>
            )}
            */}
            <span className="text-sm font-medium">{activeOrg?.name}</span>
    </div>
  )}

  {isSuperAdmin && (
    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
      Super Admin
    </Badge>
  )}
</div>

{/* Right side - Notifications and User menu */}
<div className="flex items-center gap-4">
  {/* Notifications */}
  <Button variant="ghost" size="icon" className="relative">
    <Bell className="h-5 w-5" />
  </Button>

  {/* User Menu */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-3">
        <Avatar className="h-8 w-8">
          {user.avatar && <AvatarImage src={user.avatar} />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left md:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{roleName}</p>
        </div>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel>
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => router.push('/profile')}>
        <User className="mr-2 h-4 w-4" />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => router.push('/settings')}>
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={handleLogoutAll}
        className="text-muted-foreground focus:text-foreground cursor-pointer"
      >
        <MonitorOff className="mr-2 h-4 w-4" />
        Sign out of all devices
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
</header>
  )
}
