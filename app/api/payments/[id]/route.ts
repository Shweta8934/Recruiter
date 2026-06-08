import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const updateSchema = z.object({
  amount: z.number().int().positive().optional(),
  currency: z.string().optional(),
  status: z.enum(['pending', 'succeeded', 'failed']).optional(),
  method: z.enum(['card', 'bank_transfer', 'paypal']).optional(),
  description: z.string().min(1).optional(),
  invoiceUrl: z.string().url().nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = updateSchema.parse(await req.json())
  const existing = await prisma.payment.findUnique({ where: { id }, select: { organizationId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const perm = await requirePermission({ organizationId: existing.organizationId, module: 'billing', action: 'update' })
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const access = await requireTenantAccess(existing.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const payment = await prisma.payment.update({ where: { id }, data: payload })
  return NextResponse.json({ payment })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await prisma.payment.findUnique({ where: { id }, select: { organizationId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const perm = await requirePermission({ organizationId: existing.organizationId, module: 'billing', action: 'delete' })
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const access = await requireTenantAccess(existing.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  await prisma.payment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
