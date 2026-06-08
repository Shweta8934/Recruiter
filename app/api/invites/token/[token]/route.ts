import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const invite = await prisma.invite.findUnique({ where: { token } })
  if (!invite) {
    return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
  }

  const [organization, role, inviter] = await Promise.all([
    prisma.organization.findUnique({ where: { id: invite.organizationId } }),
    prisma.role.findUnique({ where: { id: invite.roleId } }),
    prisma.user.findUnique({ where: { id: invite.invitedBy } }),
  ])

  return NextResponse.json({
    invite,
    organization,
    role,
    inviter,
  })
}
