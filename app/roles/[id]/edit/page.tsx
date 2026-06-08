'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { organizationActions } from '@/store/slices/organizationSlice'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { PageHeader } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { permissions as allPermissions } from '@/data/permissions'
import { ArrowLeft, Save, Shield } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
]

export default function EditRolePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(ROLE_COLORS[0].value)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const dispatch = useDispatch()

  useEffect(() => {
    if (!id) return
    dispatch(organizationActions.loadRoleByIdRequest({
      roleId: id,
      resolve: (role) => {
        if (!role) {
          toast.error('Role not found')
          router.push('/roles')
          return
        }
        setName(role.name ?? '')
        setDescription(role.description ?? '')
        setColor(role.color ?? ROLE_COLORS[0].value)
        setSelectedPermissions(role.permissions ?? [])
        setLoading(false)
      },
      reject: () => {
        toast.error('Role not found')
        router.push('/roles')
      }
    }))
  }, [id, router, dispatch])

  const permissionsByCategory = useMemo(
    () =>
      allPermissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = []
        acc[perm.category].push(perm)
        return acc
      }, {} as Record<string, typeof allPermissions>),
    []
  )

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    )
  }

  const toggleCategory = (category: string) => {
    const categoryPermissions = allPermissions
      .filter((p) => p.category === category)
      .map((p) => p.id)

    const allSelected = categoryPermissions.every((p) => selectedPermissions.includes(p))

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !categoryPermissions.includes(p)))
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...categoryPermissions])])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const roleSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    dispatch(organizationActions.updateRoleRequest({
      roleId: id,
      payload: {
        name: name.trim(),
        slug: roleSlug || `role-${Date.now()}`,
        description: description.trim() || 'Custom role',
        permissions: selectedPermissions,
        color,
      },
      resolve: () => {
        setSaving(false)
        toast.success('Role updated')
        router.push(`/roles/${id}`)
      },
      reject: (err) => {
        setSaving(false)
        toast.error(err || 'Failed to update role')
      }
    }))
  }

  if (loading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild type="button">
            <Link href={`/roles/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader title="Edit Role" description="Update role details and permissions">
            <Button type="submit" disabled={!name.trim() || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </PageHeader>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
            <CardDescription>Basic information about this role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Role Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`h-8 w-8 rounded-full transition-all ${
                        color === c.value ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Permissions</CardTitle>
            <CardDescription>Select permissions for this role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, perms], index) => {
                const categoryPermIds = perms.map((p) => p.id)
                const selectedCount = categoryPermIds.filter((p) => selectedPermissions.includes(p)).length
                const allSelected = selectedCount === perms.length
                const someSelected = selectedCount > 0 && !allSelected

                return (
                  <div key={category}>
                    {index > 0 && <Separator className="mb-6" />}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            ref={(el) => {
                              if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                            }}
                            onCheckedChange={(checked) => {
                              const shouldSelectAll = checked === true
                              if ((allSelected && !shouldSelectAll) || (!allSelected && shouldSelectAll)) toggleCategory(category)
                            }}
                          />
                          <h3 className="font-semibold capitalize text-lg">{category}</h3>
                        </div>
                        <span className="text-sm text-muted-foreground">{selectedCount} / {perms.length}</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {perms.map((perm) => {
                          const isSelected = selectedPermissions.includes(perm.id)
                          return (
                            <div key={perm.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted'}`}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const shouldSelect = checked === true
                                  if ((isSelected && !shouldSelect) || (!isSelected && shouldSelect)) togglePermission(perm.id)
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{perm.name}</p>
                                {perm.description && <p className="text-xs text-muted-foreground line-clamp-2">{perm.description}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </form>
    </DashboardLayout>
  )
}
