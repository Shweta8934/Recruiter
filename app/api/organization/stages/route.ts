import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

const DEFAULT_STAGES = [
  { name: 'Applied', systemId: 'applied' },
  { name: 'Written Test', systemId: 'written_test' },
  { name: 'Shortlisted', systemId: 'shortlisted' },
  { name: 'Interviewing', systemId: 'interviewed' },
  { name: 'Offered', systemId: 'offered' },
  { name: 'Rejected', systemId: 'rejected' },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    if (!organizationId) return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    let stages = await prisma.jobStage.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' }
    })

    if (stages.length === 0) {
      // Seed default stages
      await prisma.jobStage.createMany({
        data: DEFAULT_STAGES.map((s, i) => ({
          organizationId,
          name: s.name,
          systemId: s.systemId,
          order: i,
        }))
      })
      stages = await prisma.jobStage.findMany({
        where: { organizationId },
        orderBy: { order: 'asc' }
      })
    }

    return NextResponse.json({ stages })
  } catch (error) {
    console.error('Error fetching stages:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, name, emailTemplateId } = body
    if (!organizationId || !name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const access = await requireTenantAccess(organizationId)
    if (!access.ok || !['owner', 'org-admin'].includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const count = await prisma.jobStage.count({ where: { organizationId } })
    const newStage = await prisma.jobStage.create({
      data: {
        organizationId,
        name,
        order: count, // Append at the end, users can reorder later
        emailTemplateId: emailTemplateId || null
      }
    })

    return NextResponse.json({ stage: newStage })
  } catch (error) {
    console.error('Error creating stage:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, stages } = body // Accept array for reordering and updating templates
    if (!organizationId || !stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const access = await requireTenantAccess(organizationId)
    if (!access.ok || !['owner', 'org-admin'].includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update in transaction
    await prisma.$transaction(
      stages.map((stage: any, i: number) => 
        prisma.jobStage.update({
          where: { id: stage.id },
          data: { 
            order: i, 
            name: stage.name, 
            emailTemplateId: stage.emailTemplateId || null 
          }
        })
      )
    )

    const updatedStages = await prisma.jobStage.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ stages: updatedStages })
  } catch (error) {
    console.error('Error updating stages:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const id = searchParams.get('id')
    
    if (!organizationId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const access = await requireTenantAccess(organizationId)
    if (!access.ok || !['owner', 'org-admin'].includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const stage = await prisma.jobStage.findUnique({ where: { id } })
    if (!stage || stage.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }

    if (stage.systemId) {
      return NextResponse.json({ error: 'Cannot delete system stages' }, { status: 400 })
    }

    await prisma.jobStage.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting stage:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
