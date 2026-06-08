import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const skill = await prisma.skill.findUnique({
      where: { id }
    })

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(skill.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    return NextResponse.json({ skill })
  } catch (error) {
    console.error('Failed to fetch skill:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, isActive } = body

    if (!name) {
      return NextResponse.json({ error: 'Skill name is required' }, { status: 400 })
    }

    const processedName = name.trim().toLowerCase()

    const existingSkill = await prisma.skill.findUnique({
      where: { id }
    })

    if (!existingSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(existingSkill.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const perm = await requirePermission({ organizationId: existingSkill.organizationId, module: 'skills' as any, action: 'update' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Check for duplicates
    if (processedName !== existingSkill.name) {
      const duplicate = await prisma.skill.findFirst({
        where: {
          organizationId: existingSkill.organizationId,
          name: processedName
        }
      })
      
      if (duplicate) {
        return NextResponse.json({ error: 'Skill already exists in this organization' }, { status: 400 })
      }
    }

    const updatedSkill = await prisma.skill.update({
      where: { id },
      data: {
        name: processedName,
        isActive: isActive !== undefined ? isActive : existingSkill.isActive
      }
    })

    return NextResponse.json({ skill: updatedSkill })
  } catch (error) {
    console.error('Failed to update skill:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existingSkill = await prisma.skill.findUnique({
      where: { id },
      select: { organizationId: true },
    })
    if (!existingSkill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    const access = await requireTenantAccess(existingSkill.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const perm = await requirePermission({ organizationId: existingSkill.organizationId, module: 'skills' as any, action: 'delete' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    await prisma.skill.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete skill:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
