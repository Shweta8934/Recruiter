'use client'

import { PageHeader } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { getOrganizationById } from '@/data/organizations'
import { getRoleById } from '@/data/roles'
import { RoleBadge } from '@/components/rbac'
import { 
  User,
  Building2,
  Shield,
  Mail,
  Calendar,
  Settings,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export default function MemberDashboardPage() {
  const { user } = useAuth()
  
  if (!user) return null

  const organization = user.organizationId ? getOrganizationById(user.organizationId) : null
  const role = getRoleById(user.roleId)

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome, ${user.name}!`}
        description="Your personal dashboard"
      />

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <RoleBadge role={role?.name || 'Member'} />
              </div>
              {organization && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{organization.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined {format(new Date(user.joinedAt), 'MMMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Commonly used features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/settings">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
            </Link>
            {organization && (
              <Link href="/members">
                <Button variant="outline" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  View Team Members
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Organization Info */}
        {organization && (
          <Card>
            <CardHeader>
              <CardTitle>Your Organization</CardTitle>
              <CardDescription>Organization details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted font-bold text-lg">
                    {organization.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{organization.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{organization.industry}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>You are a {role?.name || 'Member'} in this organization.</p>
                  <p className="mt-1">Contact your administrator for role changes or additional access.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Organization */}
        {!organization && (
          <Card>
            <CardHeader>
              <CardTitle>No Organization</CardTitle>
              <CardDescription>You are not part of any organization yet</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You will be added to an organization when you accept an invitation 
                or when an administrator adds you to their team.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
