import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { validateStrongPassword } from '@/lib/server/passwordPolicy'
import { admin } from '@/lib/server/firebase-admin'

export async function POST(req: Request) {
  try {
    const { token, newPassword, password } = await req.json()
    const resolvedPassword = (newPassword || password || '').trim()

    if (!token || !resolvedPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }
    const passwordError = validateStrongPassword(resolvedPassword)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    // Find user with valid token
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // Verify token expiry
    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 })
    }

    // Firebase is the auth source-of-truth for login.
    if (user.firebaseUid) {
      await admin.auth().updateUser(user.firebaseUid, { password: resolvedPassword })
    }

    // Clear reset token (and keep DB password in sync if legacy field is present)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: resolvedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
