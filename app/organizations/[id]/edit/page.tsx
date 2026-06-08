'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { organizationActions } from '@/store/slices/organizationSlice'
import { RootState } from '@/store/rootReducer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/common'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function EditOrganizationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const dispatch = useDispatch()
  const saving = useSelector((state: RootState) => state.organization.isLoading)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', industry: '', description: '' })

  useEffect(() => {
    if (id) {
      dispatch(organizationActions.loadOrganizationByIdRequest({
        organizationId: id,
        resolve: (data) => {
          setForm({
            name: data.organization.name ?? '',
            email: data.organization.email ?? '',
            industry: data.organization.industry ?? '',
            description: data.organization.description ?? '',
          })
          setLoading(false)
        },
        reject: () => {
          toast.error('Organization not found')
          router.push('/organizations')
        }
      }))
    }
  }, [id, router, dispatch])

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(organizationActions.updateOrganizationRequest({
      organizationId: id,
      payload: form,
      resolve: () => {
        toast.success('Organization updated')
        router.push(`/organizations/${id}`)
      },
      reject: () => {
        toast.error('Failed to update organization')
      }
    }))
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href={`/organizations/${id}`} />
        <h1 className="text-2xl font-semibold">Edit Organization</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <form onSubmit={onSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Industry</Label><Input value={form.industry} onChange={(e)=>setForm({...form,industry:e.target.value})} required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} rows={4} /></div>
            <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
