import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const skills = await prisma.skill.findMany({
      where: {
        organizationId,
        name: {
          contains: query.toLowerCase(),
        },
        isActive: true
      },
      take: 10,
      orderBy: { name: 'asc' }
    })

    const formattedSkills = skills.map(s => ({
      id: s.id,
      name: s.name,
      prettyName: s.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }))

    return NextResponse.json({ skills: formattedSkills })
  } catch (error) {
    console.error('Failed to fetch skills:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
