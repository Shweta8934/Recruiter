import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const sections = await prisma.section.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Failed to fetch sections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, name } = body

    if (!organizationId || !name) {
      return NextResponse.json({ error: 'Organization ID and name are required' }, { status: 400 })
    }
    const perm = await requirePermission({ organizationId, module: 'sections' as any, action: 'create' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const processedName = name.trim()

    if (processedName.length < 3 || processedName.length > 30) {
      return NextResponse.json({ error: 'Section name must be between 3 and 30 characters long.' }, { status: 400 })
    }
    const nameRegex = /^[\p{L}\s'-]+$/u;
    if (!nameRegex.test(processedName)) {
      return NextResponse.json({ error: 'Section name must contain only letters and spaces.' }, { status: 400 })
    }

    // Find duplicates (case insensitive in DB context but we use precise lookup)
    const existing = await prisma.section.findFirst({
      where: {
        organizationId,
        name: processedName
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'This section already exists.' }, { status: 400 })
    }

    const section = await prisma.section.create({
      data: {
        organizationId,
        name: processedName
      }
    })

    return NextResponse.json({ section })
  } catch (error) {
    console.error('Failed to create section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
