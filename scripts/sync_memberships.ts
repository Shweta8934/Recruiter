import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL || 'mysql://root:@localhost:3306/ai_recruitment' }
  }
})

async function main() {
  const email = 'shweta.ladne@averybit.in'
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: true,
      organizationMemberships: true
    }
  })

  if (!user) {
    console.log('User not found')
    return
  }

  console.log('User currently has memberships:', user.organizationMemberships.length)

  // Find all invites they accepted
  const invites = await prisma.invite.findMany({
    where: { email, status: 'accepted' }
  })

  let added = 0
  
  // For every accepted invite, ensure they have a membership
  for (const invite of invites) {
    const role = await prisma.role.findUnique({ where: { id: invite.roleId } })
    
    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: invite.organizationId
        }
      },
      create: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: role?.slug || 'member',
        status: 'active'
      },
      update: {}
    })
    added++
  }

  // Also ensure their current User.organizationId has a membership
  if (user.organizationId) {
    const role = await prisma.role.findUnique({ where: { id: user.roleId || '' } })
    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId
        }
      },
      create: {
        userId: user.id,
        organizationId: user.organizationId,
        role: role?.slug || 'member',
        status: 'active'
      },
      update: {}
    })
    added++
  }

  console.log(`Synced ${added} potential memberships for ${email}. Please refresh your browser!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
