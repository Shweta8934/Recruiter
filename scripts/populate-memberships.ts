import { prisma } from '../lib/server/prisma';

async function main() {
  console.log('Fetching users with organizationId...');
  const users = await prisma.user.findMany({
    where: {
      organizationId: { not: null },
    },
    include: {
      role: true,
    }
  });

  console.log(`Found ${users.length} users with an organizationId.`);

  let createdCount = 0;
  for (const user of users) {
    if (!user.organizationId) continue;
    
    // Determine the role for the membership based on existing role
    let membershipRole = 'member';
    if (user.role?.slug === 'owner' || user.role?.slug === 'super-admin') {
      membershipRole = 'owner';
    } else if (user.role?.slug === 'recruiter' || user.role?.slug === 'admin') {
      membershipRole = 'recruiter';
    } else if (user.role?.slug === 'interviewer') {
      membershipRole = 'interviewer';
    }

    try {
      await prisma.organizationMembership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: user.organizationId,
          }
        },
        update: {
          role: membershipRole,
          status: user.status,
        },
        create: {
          userId: user.id,
          organizationId: user.organizationId,
          role: membershipRole,
          status: user.status,
        },
      });
      createdCount++;
    } catch (e) {
      console.error(`Failed to create membership for user ${user.id}:`, e);
    }
  }

  console.log(`Successfully synced ${createdCount} memberships.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
