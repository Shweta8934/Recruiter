import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const templates = await prisma.evaluationTemplate.findMany({
      where: { organizationId },
      include: {
        parameters: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Failed to fetch evaluation templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, createdById, name, cutoffScore, parameters } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!createdById) {
      return NextResponse.json({ error: 'Creator User ID is required' }, { status: 400 })
    }
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

    // Check unique constraint manually
    const existing = await prisma.evaluationTemplate.findFirst({
      where: {
        organizationId,
        name: processedName
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'An evaluation template with this name already exists. Please use a different name.' }, { status: 400 })
    }

    // Create template with parameters transaction
    const template = await prisma.evaluationTemplate.create({
      data: {
        organizationId,
        createdById,
        name: processedName,
        cutoffScore: cutoff,
        parameters: {
          create: parameters.map(p => ({
            name: p.name.trim(),
            weight: parseInt(p.weight, 10)
          }))
        }
      },
      include: {
        parameters: true
      }
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create evaluation template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
