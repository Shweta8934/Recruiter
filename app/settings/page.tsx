'use client'

import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Account and application settings.</p>
            <div className="flex gap-4">
              <Link href="/profile">
                <Button variant="outline">Go to Profile</Button>
              </Link>
              <Link href="/settings/tenant">
                <Button variant="outline">Tenant Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
