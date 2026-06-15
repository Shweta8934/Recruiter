import { prisma } from '../lib/server/prisma'

async function main() {
  const orgIdArg = process.argv[2]
  const userEmailArg = process.argv[3]

  let organizationId = orgIdArg
  if (!organizationId) {
    const firstOrg = await prisma.organization.findFirst({ select: { id: true, name: true } })
    if (!firstOrg) throw new Error('No organization found. Pass organizationId as first argument.')
    organizationId = firstOrg.id
    console.log(`Using first organization: ${firstOrg.name} (${firstOrg.id})`)
  }

  const existing = await prisma.role.findFirst({
    where: { organizationId, slug: 'interviewer' },
  })

  const permissions = [
    'dashboard.view',
    'candidates.view',
    'interviews.view',
    'interviews.update',
    'question_papers.view',
  ]

  const role = existing
    ? await prisma.role.update({
        where: { id: existing.id },
        data: {
          name: 'Interviewer',
          description: existing.description || 'Can view assigned candidates and manage interview tasks.',
          permissions,
          isSystem: false,
          color: existing.color || '#0EA5E9',
        },
      })
    : await prisma.role.create({
        data: {
          organizationId,
          name: 'Interviewer',
          slug: 'interviewer',
          description: 'Can view assigned candidates and manage interview tasks.',
          permissions,
          isSystem: false,
          color: '#0EA5E9',
        },
      })

  console.log(`${existing ? 'Updated' : 'Created'} interviewer role: ${role.id}`)

  if (userEmailArg) {
    const user = await prisma.user.findFirst({
      where: { email: userEmailArg, organizationId },
      select: { id: true, email: true },
    })

    if (!user) {
      console.log(`User not found in organization: ${userEmailArg}`)
      return
    }

    await prisma.user.update({ where: { id: user.id }, data: { roleId: role.id } })

    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId } },
      create: { userId: user.id, organizationId, role: 'interviewer', status: 'active' },
      update: { role: 'interviewer', status: 'active' },
    })

    console.log(`Assigned role to user: ${user.email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
