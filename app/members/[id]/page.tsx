'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { usersActions } from '@/store/slices/usersSlice'
import { DashboardLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>()
  const dispatch = useDispatch()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        await new Promise<void>((resolve, reject) => {
          dispatch(usersActions.fetchUserByIdRequest({
            id: params.id,
            resolve: (user) => {
              setData(user)
              resolve()
            },
            reject
          }))
        })
      } catch (e: any) {
        setError(e)
      }
    }
    if (params?.id) load()
  }, [params?.id, dispatch])

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Member Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && !data && <p className="text-sm text-muted-foreground">Loading...</p>}
          {data && (
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {data.name}</p>
              <p><strong>Email:</strong> {data.email}</p>
              <p><strong>Status:</strong> {data.status}</p>
              <p><strong>Organization:</strong> {data.organization?.name || '-'}</p>
              <p><strong>Role:</strong> {data.role?.name || '-'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
