import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { RoundType } from '@prisma/client'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const VALID_ROUND_TYPES = Object.values(RoundType)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const perm = await requirePermission({ organizationId, module: 'rounds' as any, action: 'create' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const rounds = await prisma.roundMaster.findMany({
      where: { organizationId },
      include: {
        evaluationTemplate: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ rounds })
  } catch (error) {
    console.error('Failed to fetch rounds:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, createdById, name, roundType, evaluationTemplateId } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!createdById) {
      return NextResponse.json({ error: 'Creator User ID is required' }, { status: 400 })
    }
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

    // Check unique constraint manually
    const existing = await prisma.roundMaster.findFirst({
      where: {
        organizationId,
        name: processedName
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A round with this exact name already exists. Please use a different name.' }, { status: 400 })
    }

    const round = await prisma.roundMaster.create({
      data: {
        organizationId,
        createdById,
        name: processedName,
        roundType,
        evaluationTemplateId: evaluationTemplateId || null
      },
      include: {
        evaluationTemplate: true
      }
    })

    return NextResponse.json({ round }, { status: 201 })
  } catch (error) {
    console.error('Failed to create round:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
