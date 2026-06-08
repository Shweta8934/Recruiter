import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { RoundType } from '@prisma/client'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

const VALID_ROUND_TYPES = Object.values(RoundType)

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const round = await prisma.roundMaster.findUnique({
      where: { id },
      include: {
        evaluationTemplate: true
      }
    })

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(round.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    return NextResponse.json({ round })
  } catch (error) {
    console.error('Failed to fetch round:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, roundType, evaluationTemplateId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Round name is required' }, { status: 400 })
    }

    const processedName = name.trim()

    if (processedName.length < 3) {
      return NextResponse.json({ error: 'Round name must be at least 3 characters long.' }, { status: 400 })
    }
    if (/\d/.test(processedName)) {
      return NextResponse.json({ error: 'Round name cannot contain numbers.' }, { status: 400 })
    }

    if (!roundType) {
      return NextResponse.json({ error: 'Round Type is required' }, { status: 400 })
    }

    // Validate RoundType enum value
    if (!VALID_ROUND_TYPES.includes(roundType)) {
      return NextResponse.json({ error: `Invalid Round Type: ${roundType}. Allowed values: ${VALID_ROUND_TYPES.join(', ')}` }, { status: 400 })
    }

    // Verify EvaluationTemplate exists if provided
    if (evaluationTemplateId) {
      const templateExists = await prisma.evaluationTemplate.findUnique({
        where: { id: evaluationTemplateId }
      })
      if (!templateExists) {
        return NextResponse.json({ error: 'Selected Evaluation Template does not exist.' }, { status: 400 })
      }
    }

    const existingRound = await prisma.roundMaster.findUnique({
      where: { id }
    })

    if (!existingRound) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingRound.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (processedName.toLowerCase() !== existingRound.name.toLowerCase()) {
      const duplicate = await prisma.roundMaster.findFirst({
        where: {
          organizationId: existingRound.organizationId,
          name: processedName,
          NOT: { id }
        }
      })
      
      if (duplicate) {
        return NextResponse.json({ error: 'A round with this name already exists.' }, { status: 400 })
      }
    }

    const updatedRound = await prisma.roundMaster.update({
      where: { id },
      data: {
        name: processedName,
        roundType,
        evaluationTemplateId: evaluationTemplateId || null
      },
      include: {
        evaluationTemplate: true
      }
    })

    return NextResponse.json({ round: updatedRound })
  } catch (error) {
    console.error('Failed to update round:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const existingRound = await prisma.roundMaster.findUnique({
      where: { id }
    })

    if (!existingRound) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingRound.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Check if this round is used in any interviews
    const interviewCount = await prisma.interview.count({
      where: { roundId: id }
    })
    if (interviewCount > 0) {
      return NextResponse.json({
        error: 'This round cannot be deleted because it is already used in one or more interviews.'
      }, { status: 400 })
    }

    await prisma.roundMaster.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete round:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
