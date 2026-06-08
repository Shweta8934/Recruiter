import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'
import { sendInviteEmail } from '@/lib/server/mailer'

const updateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled']).optional(),
  acceptedAt: z.string().datetime().optional(),
  resend: z.boolean().optional(),
  actorUserId: z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await prisma.invite.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const payload = updateSchema.parse(await req.json())
  const { actorUserId, acceptedAt, resend, ...rest } = payload
  if (resend) {
    if (before.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be resent' }, { status: 400 })
    }
    const role = await prisma.role.findUnique({ where: { id: before.roleId } })
    const org = await prisma.organization.findUnique({ where: { id: before.organizationId } })
    const inviter = await prisma.user.findUnique({ where: { id: before.invitedBy } })
    const nextExpiry = new Date()
    nextExpiry.setDate(nextExpiry.getDate() + 7)
    const token = crypto.randomUUID()
    const invite = await prisma.invite.update({
      where: { id },
      data: { token, expiresAt: nextExpiry, status: 'pending' },
    })
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await sendInviteEmail({
      to: invite.email,
      inviterName: inviter?.name || 'Admin',
      organizationName: org?.name || 'Organization',
      roleName: role?.name || 'Member',
      inviteUrl: `${baseUrl}/invite/accept/${invite.token}`,
      message: invite.message ?? undefined,
    })
    await logAudit({ actorUserId, entityType: 'invite', entityId: id, action: 'update', before, after: invite, metadata: { resend: true } })
    return NextResponse.json({ invite, resent: true })
  }
  const invite = await prisma.invite.update({
    where: { id },
    data: {
      ...rest,
      acceptedAt: acceptedAt ? new Date(acceptedAt) : undefined,
    },
  })

  await logAudit({ actorUserId, entityType: 'invite', entityId: id, action: 'update', before, after: invite })
  return NextResponse.json({ invite })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actorUserId = new URL(req.url).searchParams.get('actorUserId') ?? undefined
  const before = await prisma.invite.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.invite.delete({ where: { id } })
  await logAudit({ actorUserId, entityType: 'invite', entityId: id, action: 'delete', before })
  return NextResponse.json({ ok: true })
}
