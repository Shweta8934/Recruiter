'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { organizationActions } from '@/store/slices/organizationSlice'
import { RootState } from '@/store/rootReducer'
import { PageHeader, EmptyState } from '@/components/common'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/rbac'
import { Plus, Search, Building2, ArrowRight, Users, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Org = {
  id: string
  name: string
  email: string
  industry: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  _count?: { users: number; projects: number }
}

export default function OrganizationsPage() {
  const dispatch = useDispatch()
  const router = useRouter()
  const items = useSelector((state: RootState) => state.organization.organizations)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orgToDelete, setOrgToDelete] = useState<Org | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  useEffect(() => {
    dispatch(organizationActions.loadOrganizationsRequest({}))
  }, [dispatch])

  const handleDeleteOrg = (org: Org) => {
    setOrgToDelete(org)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!orgToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    dispatch(organizationActions.deleteOrganizationRequest({
      organizationId: orgToDelete.id,
      resolve: () => {
        setIsDeleting(false)
        setDeleteDialogOpen(false)
        setOrgToDelete(null)
        toast.success(`"${orgToDelete.name}" has been deleted`)
        dispatch(organizationActions.loadOrganizationsRequest({}))
      },
      reject: (err: string) => {
        setIsDeleting(false)
        setDeleteError(err || 'Failed to delete organization')
      }
    }))
  }

  const filtered = useMemo(() => {
    return items.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [items, searchQuery, statusFilter])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Manage all organizations in the system">
        <Link href="/organizations/create">
          <Button><Plus className="mr-2 h-4 w-4" />New Organization</Button>
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col md:flex-row gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search organizations..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold">{org.name.charAt(0)}</div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{org.industry}</TableCell>
                    <TableCell><div className="flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground" />{org._count?.users ?? 0}</div></TableCell>
                    <TableCell><StatusBadge status={org.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(org.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/organizations/${org.id}`}>
                          <Button variant="ghost" size="icon" title="View">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/organizations/${org.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteOrg(org)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Building2}
          title="No organizations found"
          description={searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Get started by creating your first organization'}
          action={{ label: 'Create Organization', onClick: () => (window.location.href = '/organizations/create') }}
        />
      )}

      {/* Delete Organization Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open && !isDeleting) { setDeleteDialogOpen(false); setOrgToDelete(null); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{orgToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setOrgToDelete(null); setDeleteError(null); }} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
