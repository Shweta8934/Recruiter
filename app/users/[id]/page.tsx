'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { PageHeader, BackButton } from '@/components/common'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/rbac'
import { ArrowLeft, Edit, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { usersActions } from '@/store/slices/usersSlice'
import { organizationActions } from '@/store/slices/organizationSlice'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type User = {
  id: string
  name: string
  email: string
  status: string
  avatar: string | null
  createdAt: string
  roleId: string | null
  role: { id: string, name: string } | null
  organizationId: string | null
  organization: { id: string, name: string } | null
  projectMemberships: Array<{ role: string, project: { id: string, name: string } }>
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const { user: currentUser } = useAuth()
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', status: '', roleId: '' })
  const [roles, setRoles] = useState<Array<{id: string, name: string}>>([])

  const isSuperAdmin = currentUser?.roleSlug === 'super-admin'
  const dispatch = useDispatch()

  useEffect(() => {
    if (!id) return;
    dispatch(usersActions.fetchUserByIdRequest({
      id,
      resolve: (u) => {
        setUser(u);
        if (u?.organizationId) {
          dispatch(organizationActions.loadRolesRequest({
            organizationId: u.organizationId,
            resolve: (data) => setRoles(data.roles || [])
          }))
        }
        setLoading(false);
      },
      reject: () => {
        router.push('/');
      }
    }));
  }, [id, router, dispatch])

  const handleEditClick = () => {
    if (!user) return
    setEditForm({ name: user.name, email: user.email, status: user.status, roleId: user.roleId || '' })
    setIsEditing(true)
  }

  const handleSaveUser = () => {
    if (!user) return;
    dispatch(usersActions.updateUserRequest({
      id: user.id,
      payload: editForm,
      resolve: () => {
        toast.success('User updated successfully');
        setIsEditing(false);
        // Refresh user data
        dispatch(usersActions.fetchUserByIdRequest({
          id,
          resolve: (u) => setUser(u)
        }));
      },
      reject: () => toast.error('Failed to update user')
    }));
  }

  if (loading) return <DashboardLayout><div className="p-6 flex justify-center text-muted-foreground">Loading user details...</div></DashboardLayout>
  if (!user) return <DashboardLayout><div className="p-6 flex justify-center text-muted-foreground">User not found</div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <PageHeader title="User Details" description={`Detailed view of ${user.name}`}>
          {isSuperAdmin && !isEditing && (
            <Button onClick={handleEditClick}>
              <Edit className="mr-2 h-4 w-4" /> Edit User
            </Button>
          )}
        </PageHeader>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              {isEditing ? (
                // Edit Form
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2 mb-4">Edit Profile</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {roles.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select value={editForm.roleId} onValueChange={v => setEditForm({...editForm, roleId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          {roles.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSaveUser}>Save Changes</Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user.avatar || ''} />
                      <AvatarFallback className="text-2xl">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-2xl font-bold">{user.name}</h4>
                      <div className="flex items-center text-muted-foreground gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User ID</p>
                      <p className="mt-1 text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{user.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Joined At</p>
                      <p className="mt-1 text-sm">{format(new Date(user.createdAt), 'PPP')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <p className="mt-1"><Badge>{user.role?.name || 'No Role'}</Badge></p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className="mt-1"><StatusBadge status={user.status as any} /></p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization</CardTitle>
            </CardHeader>
            <CardContent>
              {user.organization ? (
                <div className="p-3 bg-secondary/10 border rounded-md">
                  <div className="font-medium">{user.organization.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">ID: {user.organization.id}</div>
                  {isSuperAdmin && (
                    <Button variant="link" className="p-0 h-auto mt-2 text-xs" asChild>
                      <Link href={`/organizations/${user.organization.id}`}>View Organization Details &rarr;</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No organization assigned.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {user.projectMemberships && user.projectMemberships.length > 0 ? (
                <div className="space-y-3">
                  {user.projectMemberships.map((membership, idx) => (
                    <div key={idx} className="flex flex-col p-3 rounded-md border bg-secondary/10">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{membership.project.name}</span>
                        <Badge variant="outline" className="capitalize text-xs">{membership.role}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No projects assigned.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </DashboardLayout>
  )
}
