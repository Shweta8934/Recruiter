import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      message: 'Successfully connected to PostgreSQL',
      databaseUrlHost: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
