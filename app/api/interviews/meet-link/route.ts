import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { getSessionUser } from '@/lib/server/tenantGuard'

export async function GET(req: Request) {
  try {
    const session = await getSessionUser()
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const applicationId = searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    // Try to find the latest meetLink for this application in the AuditLog
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityId: applicationId,
        action: 'interview_assigned',
      },
      orderBy: { createdAt: 'desc' }
    })

    const meetLink = (auditLog?.metadataJson as any)?.meetLink || null
    return NextResponse.json({ meetLink })
  } catch (error) {
    console.error("Error fetching meet link:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
