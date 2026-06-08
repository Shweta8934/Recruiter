import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

const schema = z.object({
  organizationId: z.string(),
  planSlug: z.enum(['free', 'starter', 'professional', 'enterprise']),
  actorUserId: z.string().optional(),
})

const planPrice: Record<string, number> = {
  free: 0,
  starter: 2900,
  professional: 7900,
  enterprise: 19900,
}

async function ensurePlans() {
  const seeds = [
    { slug: 'free', name: 'Free', price: 0, billingCycle: 'monthly', description: 'Starter free plan' },
    { slug: 'starter', name: 'Starter', price: 29, billingCycle: 'monthly', description: 'Starter plan' },
    { slug: 'professional', name: 'Professional', price: 79, billingCycle: 'monthly', description: 'Professional plan' },
    { slug: 'enterprise', name: 'Enterprise', price: 199, billingCycle: 'monthly', description: 'Enterprise plan' },
  ]

  for (const p of seeds) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: p.slug } })
    if (!existing) {
      await prisma.subscriptionPlan.create({
        data: {
          slug: p.slug,
          name: p.name,
          price: p.price,
          billingCycle: p.billingCycle,
          description: p.description,
          features: [],
          limitsJson: {},
        },
      })
    }
  }
}

export async function POST(req: Request) {
  const payload = schema.parse(await req.json())
  const access = await requireTenantAccess(payload.organizationId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  await ensurePlans()
  let safeActorUserId: string | undefined = undefined
  if (payload.actorUserId) {
    const actor = await prisma.user.findUnique({ where: { id: payload.actorUserId } })
    if (actor) safeActorUserId = actor.id
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: payload.planSlug } })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const now = new Date()
  const next = new Date(now)
  next.setMonth(next.getMonth() + 1)

  const current = await prisma.organizationSubscription.findFirst({
    where: { organizationId: payload.organizationId },
    orderBy: { createdAt: 'desc' },
  })

  let subscription
  if (current) {
    subscription = await prisma.organizationSubscription.update({
      where: { id: current.id },
      data: {
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: next,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    })
  } else {
    subscription = await prisma.organizationSubscription.create({
      data: {
        organizationId: payload.organizationId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: next,
      },
      include: { plan: true },
    })
  }

  const payment = await prisma.payment.create({
    data: {
      organizationId: payload.organizationId,
      amount: planPrice[payload.planSlug],
      currency: 'USD',
      status: 'succeeded',
      method: 'card',
      description: `${plan.name} Plan - Monthly`,
      invoiceUrl: `https://example.com/invoice/${crypto.randomUUID()}`,
    },
  })

  try {
    await logAudit({
      actorUserId: safeActorUserId,
      entityType: 'subscription',
      entityId: subscription.id,
      action: 'update',
      after: subscription,
      metadata: { paymentId: payment.id },
    })
  } catch (e) {
    console.error('[SUBS_PURCHASE][AUDIT_FAIL]', e)
  }

  return NextResponse.json({ success: true, subscription, payment })
}
