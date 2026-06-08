import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function GET(request: Request) {
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

    return NextResponse.json({ templates: questionPapers })
  } catch (error) {
    console.error('Failed to fetch global templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { createdById } = body

    if (!createdById) {
      return NextResponse.json({ error: 'createdById is required' }, { status: 400 })
    }

    const template = await prisma.questionPaper.create({
      data: {
        createdById,
        title: 'New Global Template',
        jobTitle: 'Generic Role',
        departmentName: 'Unassigned',
        minExp: 0,
        maxExp: 0,
        duration: 60,
        isActive: true,
        isPublicActive: false,
        isTemplate: true,
        category: 'General',
        skillsList: ''
      }
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create global template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
