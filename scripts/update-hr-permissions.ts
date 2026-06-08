import { prisma } from '@/lib/server/prisma'

async function main() {
  const hrRoles = await prisma.role.findMany({ where: { slug: 'hr' } })

  if (hrRoles.length === 0) {
    console.log('No HR role found with slug "hr"')
    return
  }

  for (const role of hrRoles) {
    const nextPermissions = Array.from(
      new Set([...(role.permissions ?? []), 'invites:create', 'members:delete'])
    )

    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: nextPermissions },
    })

    console.log(`Updated HR role: ${role.id}`)
  }

  console.log('HR permissions updated successfully.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
