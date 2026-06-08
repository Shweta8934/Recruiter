import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'
import { sendInviteEmail } from '@/lib/server/mailer'
import { requireTenantAccess, getSessionUser, isSuperAdmin } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const createSchema = z.object({
  emails: z.array(z.string().email()).min(1),
  organizationId: z.string(),
  roleId: z.string(),
  projectId: z.string().optional(),
  invitedBy: z.string().optional(),
  inviterEmail: z.string().email().optional(),
  message: z.string().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('organizationId')
  const requesterUserId = searchParams.get('requesterUserId')
  if (organizationId) {
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  } else {
    const user = await getSessionUser()
    if (!isSuperAdmin(user)) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
  }

  if (organizationId && requesterUserId) {
    const requester = await prisma.user.findUnique({
      where: { id: requesterUserId },
      include: { role: true },
    })
    const isHr = requester?.role?.slug === 'hr'
    if (isHr) {
      if (requester.organizationId !== organizationId) {
        return NextResponse.json({ invites: [] })
      }
      const invites = await prisma.invite.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ invites })
    }
  }

  const invites = await prisma.invite.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ invites })
}

export async function POST(req: Request) {
  try {
    const payload = createSchema.parse(await req.json())
    const perm = await requirePermission({ organizationId: payload.organizationId, module: 'invites', action: 'create' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(payload.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [organization, role, inviterById, inviterByEmail] = await Promise.all([
      prisma.organization.findUnique({ where: { id: payload.organizationId } }),
      prisma.role.findUnique({ where: { id: payload.roleId } }),
      payload.invitedBy
        ? prisma.user.findUnique({ where: { id: payload.invitedBy } })
        : Promise.resolve(null),
      payload.inviterEmail
        ? prisma.user.findUnique({ where: { email: payload.inviterEmail } })
        : Promise.resolve(null),
    ])
    const inviter = inviterById || inviterByEmail
    if (inviter) {
      const inviterRole = await prisma.role.findUnique({ where: { id: inviter.roleId ?? '' } })
      const isHr = inviterRole?.slug === 'hr'
      if (isHr && !payload.projectId) {
        return NextResponse.json(
          { error: 'Project is required for HR invites' },
          { status: 400 }
        )
      }
    }

    if (payload.projectId) {
      const project = await prisma.project.findUnique({ where: { id: payload.projectId } })
      if (!project || project.organizationId !== payload.organizationId) {
        return NextResponse.json({ error: 'Invalid projectId for organization' }, { status: 400 })
      }
      if (inviter) {
        const inviterRole = await prisma.role.findUnique({ where: { id: inviter.roleId ?? '' } })
        const isHr = inviterRole?.slug === 'hr'
        if (isHr) {
          if (inviter.organizationId !== payload.organizationId) {
            return NextResponse.json(
              { error: 'HR can only invite candidates within their organization projects' },
              { status: 403 }
            )
          }
        }
      }
    }

    if (!organization) {
      return NextResponse.json({ error: 'Invalid organizationId' }, { status: 400 })
    }
    if (!role) {
      return NextResponse.json({ error: 'Invalid roleId' }, { status: 400 })
    }
    const roleAllowed =
      role.organizationId === organization.id || role.isSystem || role.organizationId === null
    if (!roleAllowed) {
      return NextResponse.json(
        { error: 'Selected role does not belong to this organization' },
        { status: 400 }
      )
    }
    const resolvedInviterId = inviterById?.id || inviterByEmail?.id || organization.ownerId
    const inviterName = inviterById?.name || inviterByEmail?.name || 'Admin'

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const created = await prisma.$transaction(
      payload.emails.map((email) =>
        prisma.invite.create({
          data: {
            email,
            organizationId: payload.organizationId,
            roleId: payload.roleId,
            projectId: payload.projectId,
            invitedBy: resolvedInviterId,
            message: payload.message,
            token: crypto.randomUUID(),
            status: 'pending',
            expiresAt,
          },
        })
      )
    )

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const mailResults: Array<{ email: string; sent: boolean; reason?: string }> = []
    for (const invite of created) {
      try {
        await logAudit({
          actorUserId: resolvedInviterId,
          entityType: 'invite',
          entityId: invite.id,
          action: 'create',
          after: invite,
        })
      } catch (e) {
        console.error('[INVITES][AUDIT_FAIL]', e)
      }

      try {
        const mail = await sendInviteEmail({
          to: invite.email,
          inviterName,
          organizationName: organization.name,
          roleName: role.name,
          inviteUrl: `${baseUrl}/invite/accept/${invite.token}`,
          message: invite.message ?? undefined,
        })
        mailResults.push({ email: invite.email, sent: mail.sent, reason: mail.reason })
        if (!mail.sent) {
          console.warn('[INVITES][MAIL_NOT_SENT]', invite.email, mail.reason)
        } else {

        }
      } catch (e) {
        console.error('[INVITES][MAIL_FAIL]', e)
        mailResults.push({ email: invite.email, sent: false, reason: 'MAIL_SEND_EXCEPTION' })
      }
    }

    return NextResponse.json({ invites: created, mailResults }, { status: 201 })
  } catch (e) {
    console.error('[INVITES][POST_FAIL]', e)
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid invite payload', issues: e.issues },
        { status: 400 }
      )
    }
    const message = e instanceof Error ? e.message : 'Failed to create invites'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
