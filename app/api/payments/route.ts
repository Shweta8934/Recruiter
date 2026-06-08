import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess, getSessionUser, isSuperAdmin } from '@/lib/server/tenantGuard'

const createSchema = z.object({
  organizationId: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().default('usd'),
  status: z.enum(['pending', 'succeeded', 'failed']).default('pending'),
  method: z.enum(['card', 'bank_transfer', 'paypal']),
  description: z.string().min(1),
  invoiceUrl: z.string().url().optional().nullable(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('organizationId')
  if (organizationId) {
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  } else {
    const user = await getSessionUser()
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
  }

  const payments = await prisma.payment.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ payments })
}

export async function POST(req: Request) {
  const payload = createSchema.parse(await req.json())
  const access = await requireTenantAccess(payload.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const payment = await prisma.payment.create({
    data: {
      organizationId: payload.organizationId,
      amount: payload.amount,
      currency: payload.currency,
      status: payload.status,
      method: payload.method,
      description: payload.description,
      invoiceUrl: payload.invoiceUrl || null,
    },
  })
  return NextResponse.json({ payment }, { status: 201 })
}
