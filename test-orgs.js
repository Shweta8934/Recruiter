const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const orgs = await prisma.organization.findMany()
  console.log(orgs.map(o => o.name))
}
main().catch(console.error).finally(() => prisma.$disconnect())
