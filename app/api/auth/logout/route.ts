import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true, message: 'Logged out' })
  response.cookies.set({ name: 'session', value: '', httpOnly: true, maxAge: 0, path: '/' })
  response.cookies.set({ name: 'access_token', value: '', httpOnly: true, maxAge: 0, path: '/' })
  response.cookies.set({ name: 'refresh_token', value: '', httpOnly: true, maxAge: 0, path: '/' })
  response.cookies.set({ name: 'auth-token', value: '', maxAge: 0, path: '/' })
  return response
}

