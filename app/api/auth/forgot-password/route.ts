import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { sendGenericEmail } from '@/lib/server/mailer'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Please enter registered mail' }, { status: 400 })
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save token to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Construct reset link
    // Ensure we capture the host dynamically or use localhost as fallback
    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const resetLink = `${protocol}://${host}/reset-password?token=${resetToken}`

    // Send email using generic mailer with SMTP configuration
    const emailResult = await sendGenericEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-w-md; margin: auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p>Click the button below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          <br/><br/>
          <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:<br/>${resetLink}</p>
        </div>
      `,
    })

    if (!emailResult.sent) {
      console.warn("Failed to send password reset email via SMTP.")
    }

    return NextResponse.json({ success: true, message: 'Reset email sent' })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
