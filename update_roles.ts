import { prisma } from './lib/server/prisma'
import { roles } from './data/roles'

async function main() {
  for (const role of roles) {
    if (role.isSystem) {
      await prisma.role.updateMany({
        where: { slug: role.slug },
        data: { permissions: role.permissions }
      })
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
