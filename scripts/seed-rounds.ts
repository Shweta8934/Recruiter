const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed script...");
  const orgs = await prisma.organization.findMany();

  for (const org of orgs) {
    console.log(`Processing org: ${org.name}`);
    
    // Check if rounds already exist
    const existingRounds = await prisma.roundMaster.findMany({
      where: { organizationId: org.id }
    });

    if (existingRounds.length > 0) {
      console.log(`Org ${org.name} already has rounds. Skipping.`);
      continue;
    }

    // Find the owner/creator to assign createdById
    const membership = await prisma.organizationMembership.findFirst({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'asc' } // Usually the first member is the owner
    });

    if (!membership) {
      console.log(`Org ${org.name} has no members. Skipping.`);
      continue;
    }

    const createdById = membership.userId;

    // Create a default Evaluation Template
    const template = await prisma.evaluationTemplate.create({
      data: {
        organizationId: org.id,
        name: 'Standard Interview Scorecard',
        cutoffScore: 60,
        createdById: createdById,
        parameters: {
          create: [
            { name: 'Technical Skills', description: 'Proficiency in required technologies', weight: 40, order: 1 },
            { name: 'Communication', description: 'Clarity and articulation', weight: 20, order: 2 },
            { name: 'Problem Solving', description: 'Analytical and logical reasoning', weight: 20, order: 3 },
            { name: 'Cultural Fit', description: 'Alignment with company values', weight: 20, order: 4 },
          ]
        }
      }
    });

    console.log(`Created default evaluation template for ${org.name}`);

    // Create default Rounds
    await prisma.roundMaster.createMany({
      data: [
        {
          organizationId: org.id,
          name: 'HR Screening',
          roundType: 'HR_ROUND',
          evaluationTemplateId: template.id,
          createdById: createdById,
        },
        {
          organizationId: org.id,
          name: 'Technical Interview',
          roundType: 'INTERVIEW_ROUND',
          evaluationTemplateId: template.id,
          createdById: createdById,
        },
        {
          organizationId: org.id,
          name: 'Final Discussion',
          roundType: 'FINAL_OFFER',
          evaluationTemplateId: template.id,
          createdById: createdById,
        }
      ]
    });

    console.log(`Created default rounds for ${org.name}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
