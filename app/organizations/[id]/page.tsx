'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { organizationActions } from '@/store/slices/organizationSlice'
import { RootState } from '@/store/rootReducer'
import Link from 'next/link'
import { PageHeader, Pagination, BackButton } from '@/components/common'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge, RoleBadge } from '@/components/rbac'
import { ArrowLeft, Edit, Trash2, Mail, Users, Folder, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type User = {
  id: string
  name: string
  email: string
  status: string
  avatar: string | null
  createdAt: string
  roleId: string | null
  role: { id: string, name: string } | null
  organization: { id: string, name: string } | null
  projectMemberships: Array<{ role: string, project: { id: string, name: string } }>
}

type ProjectMember = {
  role: string
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

type Project = {
  id: string
  name: string
  slug: string
  status: string
  _count: { members: number }
  members: ProjectMember[]
}

type Org = {
  id: string
  name: string
  email: string
  industry: string
  status: 'active' | 'inactive' | 'suspended'
  description?: string
  createdAt: string
  _count: { users: number; projects: number }
  users: User[]
  projects: Project[]
}

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const { user } = useAuth()
  
  const dispatch = useDispatch()
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)

  // User pagination & filter states
  const { users, totalCount } = useSelector((state: RootState) => ({
    users: state.organization.users,
    totalCount: state.organization.users.length // Temporary fallback if totalCount not in slice
  }))
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const limit = 5

  // Dialog states
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Deletion modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  const isSuperAdmin = user?.roleSlug === 'super-admin'

  useEffect(() => {
    if (id) {
      dispatch(organizationActions.loadOrganizationByIdRequest({
        organizationId: id,
        resolve: (data) => {
          setOrg(data.organization)
          setLoading(false)
        },
        reject: () => {
          router.push(withBasePath('/organizations'))
        }
      }))
    }
  }, [id, router, dispatch])

  useEffect(() => {
    if (id && isSuperAdmin) {
      dispatch(organizationActions.loadUsersRequest({
        organizationId: id,
        search,
        // page, limit, status aren't in the slice payload currently but search is supported. 
        // Real pagination might require updating the slice/saga later if needed.
        resolve: () => {}
      }))
    }
  }, [id, isSuperAdmin, page, search, statusFilter, dispatch])

  const handleConfirmDelete = () => {
    setIsDeleting(true)
    setDeleteError(null)
    dispatch(organizationActions.deleteOrganizationRequest({
      organizationId: id,
      resolve: () => {
        setIsDeleting(false)
        setDeleteModalOpen(false)
        toast.success('Organization deleted')
        router.push(withBasePath('/organizations'))
      },
      reject: (err: string) => {
        setIsDeleting(false)
        setDeleteError(err || 'Delete failed')
      }
    }))
  }

  const onDeleteUser = (userId: string) => {
    setUserToDelete(userId)
    setDeleteUserModalOpen(true)
  }

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return
    setIsDeletingUser(true)
    dispatch(organizationActions.deleteUserRequest({
      userId: userToDelete,
      resolve: () => {
        setIsDeletingUser(false)
        setDeleteUserModalOpen(false)
        setUserToDelete(null)
        toast.success('User deleted')
        dispatch(organizationActions.loadUsersRequest({ organizationId: id }))
      },
      reject: () => {
        setIsDeletingUser(false)
        setDeleteUserModalOpen(false)
        setUserToDelete(null)
        toast.error('Failed to delete user')
      }
    }))
  }



  if (loading) return <div className="p-6 flex justify-center text-muted-foreground">Loading organization data...</div>
  if (!org) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/organizations" />
        <PageHeader title={org.name} description={org.description || 'Organization details'}>
          <div className="flex items-center gap-2">
            <Link href={`/organizations/${id}/edit`}>
              <Button size="icon" variant="outline" title="Edit Organization"><Edit className="h-4 w-4" /></Button>
            </Link>
            {isSuperAdmin && (
              <Button size="icon" variant="destructive" title="Delete Organization" onClick={() => { setDeleteError(null); setDeleteModalOpen(true); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PageHeader>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="members">Members ({org._count?.users || 0})</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="projects">Projects ({org._count?.projects || 0})</TabsTrigger>}
        </TabsList>
        
        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-medium text-lg border-b pb-2">Organization Info</h3>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Email:</span> <span>{org.email}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Industry:</span> <span className="capitalize">{org.industry}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Status:</span> <StatusBadge status={org.status} /></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Created:</span> <span>{format(new Date(org.createdAt), 'MMM d, yyyy')}</span></div>
                </div>
                
                {isSuperAdmin && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-lg border-b pb-2">Quick Stats</h3>
                    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-md">
                      <div className="flex items-center text-muted-foreground"><Users className="mr-2 h-4 w-4" /> Total Members</div>
                      <span className="font-bold">{org._count?.users || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-md">
                      <div className="flex items-center text-muted-foreground"><Folder className="mr-2 h-4 w-4" /> Total Projects</div>
                      <span className="font-bold">{org._count?.projects || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {org.description && (
                <div className="pt-4 border-t">
                  <span className="text-muted-foreground block mb-2 font-medium">Description</span>
                  <p className="text-sm">{org.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEMBERS TAB */}
        {isSuperAdmin && (
          <TabsContent value="members">
            <Card>
              <div className="p-4 flex flex-col sm:flex-row gap-4 border-b items-center">
                <Input placeholder="Search members..." value={search} onChange={e => {setSearch(e.target.value); setPage(1);}} className="max-w-xs" />
                <Select value={statusFilter} onValueChange={v => {setStatusFilter(v); setPage(1);}}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar || ''} />
                              <AvatarFallback>{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{u.name}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.role ? <RoleBadge role={u.role as any} /> : <Badge variant="outline">No Role</Badge>}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={u.status as any} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(u.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild title="View Details">
                              <Link href={`/users/${u.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteUser(u.id)} title="Delete Account">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No members found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                <Pagination 
                  currentPage={page} 
                  totalPages={Math.ceil(totalCount / limit) || 1} 
                  onPageChange={setPage} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* PROJECTS TAB */}
        {isSuperAdmin && (
          <TabsContent value="projects">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {org.projects?.map(p => (
                      <React.Fragment key={p.id}>
                        <TableRow>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{p._count?.members || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => toggleProject(p.id)}>
                              {expandedProjects[p.id] ? 'Hide Allocations' : 'View Allocations'}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedProjects[p.id] && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={5} className="p-0 border-b-0">
                              <div className="p-4 pl-12 border-l-2 border-primary/20">
                                <h4 className="text-sm font-semibold mb-3">Allocated Members</h4>
                                {p.members && p.members.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {p.members.map((member, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-background">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.user.avatar || ''} />
                                            <AvatarFallback className="text-xs">{member.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex flex-col">
                                            <span className="text-sm font-medium leading-none">{member.user.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{member.user.email}</span>
                                          </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] capitalize px-1">{member.role}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No members allocated to this project.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    {(!org.projects || org.projects.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No projects found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Organization Deletion Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => { if (!isDeleting) setDeleteModalOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteError ? 'Cannot Delete Organization' : 'Delete Organization'}
            </DialogTitle>
            <DialogDescription>
              {deleteError ? (
                <span className="text-destructive font-medium block mt-2 whitespace-pre-line">
                  {deleteError}
                </span>
              ) : (
                'Are you sure you want to delete this organization? This action is permanent and cannot be undone.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            {deleteError ? (
              <Button onClick={() => setDeleteModalOpen(false)}>
                OK
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Deletion Confirmation Modal */}
      <Dialog open={deleteUserModalOpen} onOpenChange={(open) => { if (!isDeletingUser) setDeleteUserModalOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setDeleteUserModalOpen(false); setUserToDelete(null); }} disabled={isDeletingUser}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteUser} disabled={isDeletingUser}>
              {isDeletingUser ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
