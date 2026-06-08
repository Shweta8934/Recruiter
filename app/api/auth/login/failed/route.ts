import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Return 200 for security to prevent email/account harvesting
      return NextResponse.json({ locked: false })
    }

    const now = new Date()
    const windowStart = user.failedLoginWindowStart ? new Date(user.failedLoginWindowStart) : null
    const windowMs = 15 * 60 * 1000 // 15 minutes

    let attempts = user.failedLoginAttempts
    let newWindowStart = user.failedLoginWindowStart

    // If outside the 15-minute window or window is not set, reset attempts
    if (!windowStart || (now.getTime() - windowStart.getTime()) > windowMs) {
      attempts = 1
      newWindowStart = now
    } else {
      attempts += 1
    }

    let accountLockedUntil = user.accountLockedUntil
    if (attempts >= 5) {
      accountLockedUntil = new Date(now.getTime() + 15 * 60 * 1000) // lock for 15 minutes
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        failedLoginWindowStart: newWindowStart,
        accountLockedUntil,
      },
    })

    if (attempts >= 5) {
      return NextResponse.json({
        locked: true,
        lockedUntil: accountLockedUntil?.toISOString(),
        attempts,
      })
    }

    return NextResponse.json({
      locked: false,
      attempts,
      remaining: 5 - attempts,
    })
  } catch (error: any) {
    console.error('Error handling login failure:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
