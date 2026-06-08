import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { getSessionUser } from '@/lib/server/tenantGuard'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'job_application',
      action: 'interview_assigned',
    },
    select: { entityId: true, actorUserId: true, metadataJson: true },
    orderBy: { createdAt: 'desc' },
  })

  const assigned = logs.filter((l: any) => {
    const meta = (l.metadataJson || {}) as any
    return meta.assignedInterviewerUserId === user.id || l.actorUserId === user.id
  })

  return NextResponse.json({ applicationIds: Array.from(new Set(assigned.map((l) => l.entityId))) })
}
