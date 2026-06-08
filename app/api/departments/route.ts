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
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const departments = await prisma.department.findMany({
      where: { organizationId },
      include: {
        sections: {
          include: {
            section: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Map it so frontend still receives sections array
    const mappedDepartments = departments.map(d => ({
      ...d,
      sections: d.sections.map(s => s.section)
    }))

    return NextResponse.json({ departments: mappedDepartments })
  } catch (error) {
    console.error('Failed to fetch departments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, name, sectionIds } = body

    if (!organizationId || !name) {
      return NextResponse.json({ error: 'Organization ID and name are required' }, { status: 400 })
    }
    const perm = await requirePermission({ organizationId, module: 'departments' as any, action: 'create' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one section for the department.' }, { status: 400 })
    }

    const processedName = name.trim()

    if (processedName.length < 3) {
      return NextResponse.json({ error: 'Department name must be at least 3 characters long.' }, { status: 400 })
    }
    if (/\d/.test(processedName)) {
      return NextResponse.json({ error: 'Department name cannot contain numbers.' }, { status: 400 })
    }

    const existing = await prisma.department.findFirst({
      where: {
        organizationId,
        name: processedName
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A department with this exact name already exists. Please use a different name.' }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: {
        organizationId,
        name: processedName,
        sections: {
          create: sectionIds.map((id: string) => ({ sectionId: id }))
        }
      },
      include: {
        sections: {
          include: {
            section: true
          }
        }
      }
    })

    const mappedDepartment = {
      ...department,
      sections: department.sections.map(s => s.section)
    }

    return NextResponse.json({ department: mappedDepartment })
  } catch (error) {
    console.error('Failed to create department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
