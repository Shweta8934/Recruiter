import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'
import { PLAN_NAMES, PLAN_PRICING } from '@/lib/constants'

const verifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
  organizationId: z.string(),
  planSlug: z.enum(['free', 'starter', 'professional', 'enterprise', 'growth']),
  actorUserId: z.string().optional(),
})

// Ensure subscription plans exist in the DB (seeding helper)
async function ensurePlans() {
  const seeds = [
    { slug: 'free', name: 'Free', price: 0, billingCycle: 'monthly', description: 'Starter free plan' },
    { slug: 'starter', name: 'Starter', price: 29, billingCycle: 'monthly', description: 'Starter plan' },
    { slug: 'professional', name: 'Professional', price: 79, billingCycle: 'monthly', description: 'Professional plan' },
    { slug: 'growth', name: 'Growth', price: 199, billingCycle: 'monthly', description: 'Growth plan' },
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
  try {
    const body = await req.json()
    const payload = verifySchema.parse(body)

    const secret = process.env.RAZORPAY_KEY_SECRET

    // ─── DEV BYPASS MODE ──────────────────────────────────────────────────────
    // When RAZORPAY_BYPASS=true, signature check is skipped entirely.
    // The frontend sends razorpay_signature='bypass' as the sentinel value.
    const isBypassMode =
      process.env.RAZORPAY_BYPASS === 'true' &&
      payload.razorpay_signature === 'bypass'

    if (!isBypassMode) {
      if (!secret) {
        return NextResponse.json({ error: 'Razorpay secret key not configured' }, { status: 500 })
      }

      // Standard Razorpay checkout HMAC: SHA256(order_id + "|" + payment_id)
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(payload.razorpay_order_id + '|' + payload.razorpay_payment_id)
        .digest('hex')

      if (generated_signature !== payload.razorpay_signature) {
        console.error('[RAZORPAY_VERIFY] Signature mismatch')
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
      }
    } else {

    }
    // ──────────────────────────────────────────────────────────────────────────

    await ensurePlans()

    const { organizationId, planSlug, actorUserId, razorpay_payment_id } = payload



    const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } })
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found in database' }, { status: 404 })
    }

    const now = new Date()
    const nextPeriod = new Date(now)
    nextPeriod.setMonth(nextPeriod.getMonth() + 1)

    // 0. Ensure the User exists (since auth might be mock data)
    const mockUserId = actorUserId || 'mock_user_id'
    await prisma.user.upsert({
      where: { id: mockUserId },
      update: {},
      create: {
        id: mockUserId,
        name: 'Mock User',
        email: `mockuser-${mockUserId}@example.com`,
      }
    })

    // 1. Ensure the Organization exists (since auth might be mock data)
    await prisma.organization.upsert({
      where: { id: organizationId },
      update: {},
      create: {
        id: organizationId,
        name: `Mock Organization ${organizationId}`,
        slug: `mock-org-${organizationId}`,
        email: `billing-${organizationId}@example.com`,
        industry: 'Technology',
        ownerId: mockUserId,
        subscriptionPlanId: plan.id,
      },
    })

    // 2. Find and update or create OrganizationSubscription
    const currentSubscription = await prisma.organizationSubscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    let subscription
    if (currentSubscription) {
      subscription = await prisma.organizationSubscription.update({
        where: { id: currentSubscription.id },
        data: {
          planId: plan.id,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriod,
          cancelAtPeriodEnd: false,
        },
        include: { plan: true },
      })
    } else {
      subscription = await prisma.organizationSubscription.create({
        data: {
          organizationId,
          planId: plan.id,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriod,
        },
        include: { plan: true },
      })
    }

    // 3. Sync the organization's subscriptionPlanId
    await prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionPlanId: plan.id },
    })

    // 4. Create a payment ledger entry
    const pricing = (PLAN_PRICING as any)[planSlug] || { monthly: 0 }
    const paymentAmount = pricing.monthly * 100 // paisa

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        amount: paymentAmount,
        currency: 'inr',
        status: 'succeeded',
        method: 'card',
        description: `${plan.name} Plan Subscription - Monthly`,
        invoiceUrl: `https://dashboard.razorpay.com/app/payments/${razorpay_payment_id}`,
      },
    })

    // 5. Log audit log
    try {
      let safeActorUserId: string | null = null
      if (actorUserId) {
        const actor = await prisma.user.findUnique({ where: { id: actorUserId } })
        if (actor) safeActorUserId = actor.id
      }

      await logAudit({
        actorUserId: safeActorUserId,
        entityType: 'subscription',
        entityId: subscription.id,
        action: 'update',
        after: subscription,
        metadata: { paymentId: payment.id, razorpay_payment_id, razorpay_order_id: payload.razorpay_order_id },
      })
    } catch (auditErr) {
      console.error('[RAZORPAY_VERIFY][AUDIT_ERR]', auditErr)
    }


    return NextResponse.json({ success: true, subscriptionId: subscription.id })

  } catch (error: any) {
    console.error('[RAZORPAY_VERIFY_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to verify payment', details: error.message },
      { status: 500 }
    )
  }
}
