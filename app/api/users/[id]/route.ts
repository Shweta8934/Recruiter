import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'
import { requireTenantAccess, getSessionUser, isSuperAdmin } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'
import { admin } from '@/lib/server/firebase-admin'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'suspended', 'deactivated', 'pending']).optional(),
  roleId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  avatar: z.string().optional(),
  actorUserId: z.string().optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
      projectMemberships: {
        select: {
          role: true,
          project: { select: { id: true, name: true } }
        }
      }
    }
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.organizationId) {
    const access = await requireTenantAccess(user.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  }
  return NextResponse.json({ user })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await prisma.user.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Allow users to update their own profile without extra permissions
  const sessionUser = await getSessionUser()
  const isSelf = sessionUser?.id === id
  const isAdmin = isSuperAdmin(sessionUser)

  if (!isSelf && !isAdmin && before.organizationId) {
    const perm = await requirePermission({ organizationId: before.organizationId, module: 'members', action: 'update' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  }

  if (before.organizationId) {
    const access = await requireTenantAccess(before.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const payload = updateSchema.parse(await req.json())
  const { actorUserId, ...data } = payload
  const user = await prisma.user.update({ where: { id }, data })

  if (typeof payload.status !== 'undefined' && before.firebaseUid) {
    const disabled = payload.status === 'suspended' || payload.status === 'deactivated'
    await admin.auth().updateUser(before.firebaseUid, { disabled })
  }

  await logAudit({ actorUserId, entityType: 'user', entityId: id, action: 'update', before, after: user })
  return NextResponse.json({ user })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actorUserId = new URL(req.url).searchParams.get('actorUserId') ?? undefined
  const before = await prisma.user.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (before.organizationId) {
    const perm = await requirePermission({ organizationId: before.organizationId, module: 'members', action: 'delete' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(before.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  }

  // Check for active dependencies that should block deletion
  const [
    ownedOrgCount,
    inviteCount,
    candidateInviteCount,
    evalTemplateCount,
    questionPaperCount,
    roundMasterCount,
    interviewParticipantCount,
    interviewFeedbackCount,
    createdJobCount,
  ] = await Promise.all([
    prisma.organization.count({ where: { ownerId: id } }),
    prisma.invite.count({ where: { invitedBy: id } }),
    prisma.jobCandidateInvite.count({ where: { invitedBy: id } }),
    prisma.evaluationTemplate.count({ where: { createdById: id } }),
    prisma.questionPaper.count({ where: { createdById: id } }),
    prisma.roundMaster.count({ where: { createdById: id } }),
    prisma.interviewParticipant.count({ where: { userId: id } }),
    prisma.interviewFeedback.count({ where: { interviewerId: id } }),
    prisma.job.count({ where: { createdBy: id } }),
  ])

  const blockers: string[] = []
  if (ownedOrgCount > 0) blockers.push(`owns ${ownedOrgCount} organization(s)`)
  if (inviteCount > 0) blockers.push(`sent ${inviteCount} team invite(s)`)
  if (candidateInviteCount > 0) blockers.push(`sent ${candidateInviteCount} candidate invite(s)`)
  if (evalTemplateCount > 0) blockers.push(`created ${evalTemplateCount} evaluation template(s)`)
  if (questionPaperCount > 0) blockers.push(`created ${questionPaperCount} question paper(s)`)
  if (roundMasterCount > 0) blockers.push(`created ${roundMasterCount} round master(s)`)
  if (interviewParticipantCount > 0) blockers.push(`is participating in ${interviewParticipantCount} interview(s)`)
  if (interviewFeedbackCount > 0) blockers.push(`has provided ${interviewFeedbackCount} interview feedback(s)`)
  if (createdJobCount > 0) blockers.push(`created ${createdJobCount} job(s)`)

  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Cannot remove member because they: ${blockers.join(', ')}. Please reassign or delete these records first.` },
      { status: 400 }
    )
  }

  await prisma.user.delete({ where: { id } })
  await logAudit({ actorUserId, entityType: 'user', entityId: id, action: 'delete', before })
  return NextResponse.json({ ok: true })
}
