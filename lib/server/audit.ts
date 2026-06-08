import { prisma } from './prisma'

export async function logAudit(params: {
  actorUserId?: string | null
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeJson: params.before as any,
      afterJson: params.after as any,
      metadataJson: params.metadata as any,
    },
  })
}
