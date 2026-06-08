import { prisma } from '../lib/server/prisma'

async function main() {
  const email = process.argv[2]
  if (!email) throw new Error('Usage: npx tsx scripts/assign-interviewer-to-user.ts <user-email>')

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, organizationId: true, roleId: true },
  })

  if (!user) throw new Error(`User not found: ${email}`)
  if (!user.organizationId) throw new Error(`User has no organization assigned: ${email}`)

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { id: true, name: true } })
  if (!org) throw new Error(`Organization not found: ${user.organizationId}`)

  let role = await prisma.role.findFirst({
    where: { organizationId: org.id, slug: 'interviewer' },
  })

  const permissions = [
    'dashboard.view',
    'candidates.view',
    'interviews.view',
    'interviews.update',
    'question_papers.view',
  ]

  if (!role) {
    role = await prisma.role.create({
      data: {
        organizationId: org.id,
        name: 'Interviewer',
        slug: 'interviewer',
        description: 'Can view assigned candidates and manage interview tasks.',
        permissions,
        isSystem: false,
        color: '#0EA5E9',
      },
    })
    console.log(`Created interviewer role in org ${org.name}: ${role.id}`)
  } else {
    role = await prisma.role.update({
      where: { id: role.id },
      data: { permissions },
    })
    console.log(`Found interviewer role in org ${org.name}: ${role.id}`)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { roleId: role.id },
  })

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    create: { userId: user.id, organizationId: org.id, role: 'interviewer', status: 'active' },
    update: { role: 'interviewer', status: 'active' },
  })

  console.log(`Assigned interviewer role to ${user.email} in org ${org.name}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
