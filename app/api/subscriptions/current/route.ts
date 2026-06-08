import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('organizationId')
  if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 })
  const access = await requireTenantAccess(organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const sub = await prisma.organizationSubscription.findFirst({
    where: { organizationId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ subscription: sub })
}
