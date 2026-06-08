import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { applicationIds, status, statusReason } = body
    
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: 'No applications selected' }, { status: 400 })
    }
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const job = await prisma.job.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const access = await requireTenantAccess(job.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const apps = await prisma.jobApplication.findMany({
      where: { id: { in: applicationIds }, jobId: id },
      select: { id: true, organizationId: true, jobId: true, status: true },
    })

    await prisma.jobApplication.updateMany({
      where: {
        id: { in: applicationIds },
        jobId: id,
      },
      data: {
        status,
        ...(statusReason ? { statusReason } : {})
      }
    })

    const stageRows = apps
      .filter((a) => a.status !== status)
      .map((a) => ({
        organizationId: a.organizationId,
        jobId: a.jobId,
        applicationId: a.id,
        fromStatus: a.status,
        toStatus: status,
        changedByUserId: access.user.id,
        note: statusReason || null,
      }))

    if (stageRows.length > 0) {
      await prisma.jobApplicationStageHistory.createMany({ data: stageRows })
    }

    return NextResponse.json({ success: true, count: applicationIds.length }, { status: 200 })
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json({ error: 'Failed to update applications' }, { status: 500 })
  }
}
