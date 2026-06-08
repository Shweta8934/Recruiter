import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  email: z.string().email(),
  industry: z.string().min(2),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  ownerId: z.string().min(1).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
})

export async function GET() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      owner: true,
      _count: {
        select: { users: true, projects: true }
      }
    }
  })
  return NextResponse.json({ organizations })
}

export async function POST(req: Request) {
  const json = await req.json()
  const payload = createSchema.parse(json)

  let ownerId = payload.ownerId
  if (ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId } })
    if (!owner) ownerId = undefined
  }

  if (!ownerId) {
    let bootstrapOwner = await prisma.user.findFirst({
      where: { email: 'superadmin@example.com' },
    })
    if (!bootstrapOwner) {
      bootstrapOwner = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: 'superadmin@example.com',
          password: 'password123',
          status: 'active',
        },
      })
    }
    ownerId = bootstrapOwner.id
  }

  const existingOrg = await prisma.organization.findUnique({
    where: { slug: payload.slug },
  })

  if (existingOrg) {
    return NextResponse.json(
      { error: 'An organization with this slug already exists. Please choose a different one.' },
      { status: 400 }
    )
  }

  const created = await prisma.organization.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      email: payload.email,
      industry: payload.industry,
      status: payload.status,
      ownerId,
      description: payload.description,
      logo: payload.logo,
    },
  })

  await logAudit({
    actorUserId: ownerId,
    entityType: 'organization',
    entityId: created.id,
    action: 'create',
    after: created,
  })

  return NextResponse.json({ organization: created }, { status: 201 })
}
