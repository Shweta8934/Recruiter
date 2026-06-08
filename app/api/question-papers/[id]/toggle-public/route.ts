import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    })

    if (!paper) {
      return NextResponse.json({ error: 'Question paper not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(paper.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const updated = await prisma.questionPaper.update({
      where: { id },
      data: { isPublicActive: !paper.isPublicActive }
    })

    return NextResponse.json({ isPublicActive: updated.isPublicActive })
  } catch (error) {
    console.error('Failed to toggle public status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
