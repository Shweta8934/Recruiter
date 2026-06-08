import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/server/tenantGuard'

async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials are not configured in .env')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Zoom token fetch failed: ${err}`)
  }

  const data = await res.json()
  return data.access_token
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser()
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { topic, startTime, duration = 60 } = body

    if (!topic || !startTime) {
      return NextResponse.json({ error: 'Missing topic or startTime' }, { status: 400 })
    }

    const accessToken = await getZoomAccessToken()

    const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: new Date(startTime).toISOString(),
        duration,
        timezone: 'Asia/Kolkata',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          waiting_room: false,
          auto_recording: 'none',
        },
      }),
    })

    if (!meetingRes.ok) {
      const err = await meetingRes.text()
      throw new Error(`Zoom meeting creation failed: ${err}`)
    }

    const meeting = await meetingRes.json()

    return NextResponse.json({
      joinUrl: meeting.join_url,
      meetingId: meeting.id,
      password: meeting.password,
      startUrl: meeting.start_url,
    })
  } catch (e: any) {
    console.error('Zoom create-meeting error:', e)
    return NextResponse.json({ error: e.message || 'Failed to create Zoom meeting' }, { status: 500 })
  }
}
