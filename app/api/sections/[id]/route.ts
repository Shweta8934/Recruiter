import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Section name is required' }, { status: 400 })
    }

    const processedName = name.trim()

    if (processedName.length < 3 || processedName.length > 30) {
      return NextResponse.json({ error: 'Section name must be between 3 and 30 characters long.' }, { status: 400 })
    }
    const nameRegex = /^[\p{L}\s'-]+$/u;
    if (!nameRegex.test(processedName)) {
      return NextResponse.json({ error: 'Section name must contain only letters and spaces.' }, { status: 400 })
    }

    const existingSection = await prisma.section.findUnique({
      where: { id }
    })

    if (!existingSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingSection.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const perm = await requirePermission({ organizationId: existingSection.organizationId, module: 'sections' as any, action: 'update' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (processedName !== existingSection.name) {
      const duplicate = await prisma.section.findFirst({
        where: {
          organizationId: existingSection.organizationId,
          name: processedName
        }
      })
      
      if (duplicate) {
        return NextResponse.json({ error: 'Section already exists' }, { status: 400 })
      }
    }

    const updatedSection = await prisma.section.update({
      where: { id },
      data: { name: processedName }
    })

    return NextResponse.json({ section: updatedSection })
  } catch (error) {
    console.error('Failed to update section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existingSection = await prisma.section.findUnique({
      where: { id },
      select: { organizationId: true },
    })
    if (!existingSection) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    const access = await requireTenantAccess(existingSection.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const perm = await requirePermission({ organizationId: existingSection.organizationId, module: 'sections' as any, action: 'delete' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Check if the section is used in any department
    const departmentsUsingSection = await prisma.departmentSection.findMany({
      where: { sectionId: id },
      include: {
        department: {
          select: { name: true }
        }
      }
    })
    if (departmentsUsingSection.length > 0) {
      const departmentNames = departmentsUsingSection.map(ds => ds.department.name).join(', ')
      return NextResponse.json({
        error: `Cannot delete section because it is connected with the following departments: ${departmentNames}. Please disconnect it from those departments first.`
      }, { status: 400 })
    }

    await prisma.section.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
