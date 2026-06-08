import { NextResponse } from 'next/server'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { PLAN_NAMES, PLAN_PRICING } from '@/lib/constants'

const checkoutSchema = z.object({
  organizationId: z.string(),
  planSlug: z.enum(['free', 'starter', 'professional', 'enterprise', 'growth']),
  actorUserId: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const payload = checkoutSchema.parse(body)

    // ─── DEV BYPASS MODE ────────────────────────────────────────────────────
    // RAZORPAY_BYPASS=true → skips Razorpay entirely, activates plan directly.
    // Set RAZORPAY_BYPASS=false in production for real payments.
    if (process.env.RAZORPAY_BYPASS === 'true') {

      return NextResponse.json({
        success: true,
        bypass: true,
        planSlug: payload.planSlug,
        organizationId: payload.organizationId,
        actorUserId: payload.actorUserId ?? null,
      })
    }
    // ────────────────────────────────────────────────────────────────────────

    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: 'Razorpay keys are not configured.' }, { status: 500 })
    }

    const razorpay = new Razorpay({ key_id, key_secret })

    // INR amount from constants — monthly stores rupees (e.g. 7999), × 100 = paisa
    const pricing = (PLAN_PRICING as any)[payload.planSlug] || { monthly: 0 }
    const amount = pricing.monthly * 100  // paisa (INR)

    if (amount === 0) {
      return NextResponse.json({ error: 'Cannot checkout free or invalid plan.' }, { status: 400 })
    }

    const planDisplayName = (PLAN_NAMES as any)[payload.planSlug] || payload.planSlug

    // Create a Razorpay Order — required for SDK checkout popup
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        organizationId: payload.organizationId,
        planSlug: payload.planSlug,
        actorUserId: payload.actorUserId || '',
        planName: planDisplayName,
      },
    })

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id,                   // sent to frontend to initialise Razorpay SDK
      planName: planDisplayName,
    })

  } catch (error) {
    console.error('[RAZORPAY_ORDER_ERROR]', error)
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Failed to create Razorpay order' },
      { status: 500 }
    )
  }
}
