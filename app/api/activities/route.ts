import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess, getSessionUser, isSuperAdmin } from '@/lib/server/tenantGuard'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('organizationId')
  const limit = Number(searchParams.get('limit') || 20)
  if (organizationId) {
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  } else {
    const user = await getSessionUser()
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
  }

  const activities = await prisma.activity.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Number.isNaN(limit) ? 20 : Math.min(limit, 100),
    include: {
      organization: true,
    },
  })

  return NextResponse.json({ activities })
}
