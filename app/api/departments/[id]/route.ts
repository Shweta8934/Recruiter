import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            section: true
          }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(department.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const mappedDepartment = {
      ...department,
      sections: department.sections.map(s => s.section)
    }

    return NextResponse.json({ department: mappedDepartment })
  } catch (error) {
    console.error('Failed to fetch department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, sectionIds } = body

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
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

    const existingDept = await prisma.department.findUnique({
      where: { id }
    })

    if (!existingDept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingDept.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const perm = await requirePermission({ organizationId: existingDept.organizationId, module: 'departments' as any, action: 'update' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (processedName !== existingDept.name) {
      const duplicate = await prisma.department.findFirst({
        where: {
          organizationId: existingDept.organizationId,
          name: processedName
        }
      })
      
      if (duplicate) {
        return NextResponse.json({ error: 'Department already exists' }, { status: 400 })
      }
    }

    const updatedDept = await prisma.department.update({
      where: { id },
      data: {
        name: processedName,
        sections: {
          deleteMany: {}, // Clear all existing DepartmentSection relations
          create: sectionIds.map((sid: string) => ({ sectionId: sid }))
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
      ...updatedDept,
      sections: updatedDept.sections.map(s => s.section)
    }

    return NextResponse.json({ department: mappedDepartment })
  } catch (error) {
    console.error('Failed to update department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const existingDept = await prisma.department.findUnique({
      where: { id },
      select: { organizationId: true },
    })
    if (!existingDept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    const access = await requireTenantAccess(existingDept.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const perm = await requirePermission({ organizationId: existingDept.organizationId, module: 'departments' as any, action: 'delete' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    await prisma.department.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
