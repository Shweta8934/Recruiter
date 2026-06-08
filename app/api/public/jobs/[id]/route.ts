import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      location: true,
      employmentType: true,
      experience: true,
      status: true,
      organization: { select: { name: true } },
      customQuestions: true,
    },
  })

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json({ job })
}
