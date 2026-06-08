const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const questionPapers = await prisma.questionPaper.findMany({
      where: {
        isTemplate: true,
        isActive: true
      },
      include: {
        sections: {
          include: {
            questions: true
          }
        },
        _count: {
          select: { templateUsages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (e) {
    console.error('Prisma Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
