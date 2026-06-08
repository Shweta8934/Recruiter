import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const template = await prisma.evaluationTemplate.findUnique({
      where: { id },
      include: {
        parameters: {
          orderBy: { createdAt: 'asc' }
        },
        rounds: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Evaluation template not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(template.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to fetch evaluation template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, cutoffScore, parameters } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    const processedName = name.trim()

    if (processedName.length < 3) {
      return NextResponse.json({ error: 'Evaluation template name must be at least 3 characters long.' }, { status: 400 })
    }
    if (/\d/.test(processedName)) {
      return NextResponse.json({ error: 'Evaluation template name cannot contain numbers.' }, { status: 400 })
    }

    // Validate cutoff score
    const cutoff = parseInt(cutoffScore, 10)
    if (isNaN(cutoff) || cutoff < 0 || cutoff > 100) {
      return NextResponse.json({ error: 'Cutoff score must be a number between 0 and 100' }, { status: 400 })
    }

    // Validate parameters
    if (!Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json({ error: 'Please add at least one evaluation parameter.' }, { status: 400 })
    }

    for (const param of parameters) {
      if (!param.name || !param.name.trim()) {
        return NextResponse.json({ error: 'All parameters must have a name.' }, { status: 400 })
      }
      const weight = parseInt(param.weight, 10)
      if (isNaN(weight) || weight < 0 || weight > 10) {
        return NextResponse.json({ error: `Parameter "${param.name}" weight must be a number between 0 and 10.` }, { status: 400 })
      }
    }

    const existingTemplate = await prisma.evaluationTemplate.findUnique({
      where: { id }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Evaluation template not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingTemplate.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (processedName.toLowerCase() !== existingTemplate.name.toLowerCase()) {
      const duplicate = await prisma.evaluationTemplate.findFirst({
        where: {
          organizationId: existingTemplate.organizationId,
          name: processedName,
          NOT: { id }
        }
      })
      
      if (duplicate) {
        return NextResponse.json({ error: 'An evaluation template with this name already exists.' }, { status: 400 })
      }
    }

    const updatedTemplate = await prisma.evaluationTemplate.update({
      where: { id },
      data: {
        name: processedName,
        cutoffScore: cutoff,
        parameters: {
          deleteMany: {},
          create: parameters.map(p => ({
            name: p.name.trim(),
            weight: parseInt(p.weight, 10)
          }))
        }
      },
      include: {
        parameters: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Failed to update evaluation template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: any }) {
  return PUT(request, { params });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params

    const existingTemplate = await prisma.evaluationTemplate.findUnique({
      where: { id },
      include: { rounds: true, parameters: true }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Evaluation template not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingTemplate.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Check if it is currently linked to any RoundMaster
    if (existingTemplate.rounds.length > 0) {
      const roundNames = existingTemplate.rounds.map(r => r.name).join(', ')
      return NextResponse.json({ 
        error: `Cannot delete template because it is linked to the following interview rounds: ${roundNames}. Please unlink it from those rounds first.` 
      }, { status: 400 })
    }

    // Check if any candidate has been evaluated using this template
    const parameterIds = existingTemplate.parameters.map(p => p.id)
    const feedbackScoreCount = await prisma.interviewFeedbackScore.count({
      where: {
        parameterId: { in: parameterIds }
      }
    })
    if (feedbackScoreCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete template because it has already been used to evaluate candidates. You can only modify it or keep it as is.'
      }, { status: 400 })
    }

    await prisma.evaluationTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete evaluation template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
