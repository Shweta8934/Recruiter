import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  email: z.string().email().optional(),
  industry: z.string().min(2).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  settings: z.any().optional(),
  actorUserId: z.string().optional(),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, projects: true }
      },

      projects: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          _count: { select: { members: true } },
          members: {
            select: {
              role: true,
              user: {
                select: { id: true, name: true, email: true, avatar: true }
              }
            }
          }
        }
      }
    }
  })
  
  if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ organization })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await prisma.organization.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const json = await req.json()
  const payload = updateSchema.parse(json)
  const { actorUserId, ...data } = payload

  const updated = await prisma.organization.update({ where: { id }, data })
  await logAudit({ actorUserId, entityType: 'organization', entityId: id, action: 'update', before, after: updated })

  return NextResponse.json({ organization: updated })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actorUserId = new URL(req.url).searchParams.get('actorUserId') ?? undefined
  
  const before = await prisma.organization.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check for active dependencies that should block deletion
  const [
    userCount,
    projectCount,
    jobCount,
    inviteCount,
    roleCount,
    subscriptionCount,
    paymentCount,
  ] = await Promise.all([
    prisma.user.count({ where: { organizationId: id } }),
    prisma.project.count({ where: { organizationId: id } }),
    prisma.job.count({ where: { organizationId: id } }),
    prisma.invite.count({ where: { organizationId: id } }),
    prisma.role.count({ where: { organizationId: id, isSystem: false } }),
    prisma.organizationSubscription.count({ where: { organizationId: id } }),
    prisma.payment.count({ where: { organizationId: id } }),
  ])

  const blockers: string[] = []
  if (userCount > 0) blockers.push(`${userCount} associated user(s)`)
  if (projectCount > 0) blockers.push(`${projectCount} active project(s)`)
  if (jobCount > 0) blockers.push(`${jobCount} job(s)`)
  if (inviteCount > 0) blockers.push(`${inviteCount} pending/sent invite(s)`)
  if (roleCount > 0) blockers.push(`${roleCount} custom role(s)`)
  if (subscriptionCount > 0) blockers.push(`${subscriptionCount} active subscription(s)`)
  if (paymentCount > 0) blockers.push(`${paymentCount} payment record(s)`)

  if (blockers.length > 0) {
    return NextResponse.json({
      error: `Cannot delete organization because it has active dependencies: ${blockers.join(', ')}. Please remove these before deleting the organization.`
    }, { status: 400 })
  }

  // Programmatically delete non-blocking metadata/logs and the organization in a transaction
  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { organizationId: id } }),
    prisma.organization.delete({ where: { id } }),
  ])

  await logAudit({ actorUserId, entityType: 'organization', entityId: id, action: 'delete', before })
  
  return NextResponse.json({ ok: true })
}

