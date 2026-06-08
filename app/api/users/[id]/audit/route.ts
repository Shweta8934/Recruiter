import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '5')

  const targetUser = await prisma.user.findUnique({ where: { id }, select: { organizationId: true } })
  if (!targetUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (targetUser.organizationId) {
    const access = await requireTenantAccess(targetUser.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const logs = await prisma.auditLog.findMany({
    where: { actorUserId: id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    }
  })

  return NextResponse.json({ logs })
}
