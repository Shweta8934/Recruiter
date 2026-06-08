import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

const addSchema = z.object({
  userId: z.string(),
  role: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = addSchema.parse(await req.json())

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const access = await requireTenantAccess(project.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || user.organizationId !== project.organizationId) {
    return NextResponse.json({ error: 'User not in same organization' }, { status: 400 })
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: id, userId: payload.userId } },
    create: { projectId: id, userId: payload.userId, role: payload.role || 'member' },
    update: { role: payload.role || 'member' },
  })
  return NextResponse.json({ member })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const project = await prisma.project.findUnique({ where: { id }, select: { organizationId: true } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const access = await requireTenantAccess(project.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: id, userId } },
  })
  return NextResponse.json({ ok: true })
}
