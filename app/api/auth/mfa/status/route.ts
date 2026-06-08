import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '../_utils'

export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  return NextResponse.json({
    mfa: {
      enabled: auth.user.mfaEnabled,
      method: auth.user.mfaMethod,
      required: auth.user.mfaRequired,
      enrolledAt: auth.user.mfaEnrolledAt,
      maskedPhone: auth.user.mfaPhone ? `***${auth.user.mfaPhone.slice(-4)}` : null,
    },
  })
}
