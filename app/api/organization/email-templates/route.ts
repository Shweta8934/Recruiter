import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    if (!organizationId) return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const templates = await prisma.emailTemplate.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, name, subject, body: content } = body
    if (!organizationId || !name || !subject || !content) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const access = await requireTenantAccess(organizationId)
    if (!access.ok || !['owner', 'org-admin'].includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const newTemplate = await prisma.emailTemplate.create({
      data: {
        organizationId,
        name,
        subject,
        body: content
      }
    })

    return NextResponse.json({ template: newTemplate })
  } catch (error) {
    console.error('Error creating email template:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, organizationId, name, subject, body: content } = body
    if (!id || !organizationId || !name || !subject || !content) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const access = await requireTenantAccess(organizationId)
    if (!access.ok || !['owner', 'org-admin'].includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const template = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!template || template.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: { name, subject, body: content }
    })

    return NextResponse.json({ template: updated })
  } catch (error) {
    console.error('Error updating email template:', error)
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

    const template = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!template || template.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    await prisma.emailTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email template:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
