import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { logAudit } from '@/lib/server/audit'

const ALLOWED_ROLES = ['org-admin', 'hr', 'recruiter', 'super-admin']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    
    // Optional filters
    const skill = searchParams.get('skill')
    const difficulty = searchParams.get('difficulty')
    const type = searchParams.get('type')
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    
    // Explicit Role Check based on user request
    if (!access.user.roleSlug || !ALLOWED_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to access the library.' }, { status: 403 })
    }

    const whereClause: any = { organizationId }
    if (skill) {
      whereClause.skills = { path: '$[*]', array_contains: skill }
    }
    if (difficulty) {
      whereClause.difficulty = parseInt(difficulty)
    }
    if (type) {
      whereClause.questionType = type
    }
    if (departmentId) whereClause.departmentId = departmentId
    if (status) whereClause.status = status

    const libraryQuestions = await prisma.libraryQuestion.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ libraryQuestions })
  } catch (error) {
    console.error('Failed to fetch library questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      organizationId, text, answer, options, questionType, 
      skills, difficulty, language, testCases, departmentId, status, aiGenerated
    } = body

    if (!organizationId || !text || !questionType) {
      return NextResponse.json({ error: 'Organization, question text and question type are required.' }, { status: 400 })
    }
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ error: 'At least one skill is required.' }, { status: 400 })
    }
    if (!departmentId) {
      return NextResponse.json({ error: 'Department is required.' }, { status: 400 })
    }
    if (!difficulty || Number(difficulty) < 1 || Number(difficulty) > 5) {
      return NextResponse.json({ error: 'Difficulty must be between 1 and 5.' }, { status: 400 })
    }
    if (questionType === 'CODE' && !language) {
      return NextResponse.json({ error: 'Coding language is required for CODE questions.' }, { status: 400 })
    }
    if (questionType === 'MCQ') {
      const validOptions = (options || []).filter((o: string) => String(o).trim() !== '')
      if (validOptions.length < 2) {
        return NextResponse.json({ error: 'MCQ requires at least two options.' }, { status: 400 })
      }
      if (!answer || String(answer).trim() === '') {
        return NextResponse.json({ error: 'MCQ answer is required.' }, { status: 400 })
      }
    }

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!access.user.roleSlug || !ALLOWED_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to create library questions.' }, { status: 403 })
    }
    const isAdminReviewer = access.user.roleSlug === 'org-admin' || access.user.roleSlug === 'super-admin'

    const created = await prisma.libraryQuestion.create({
      data: {
        organizationId,
        text,
        answer: answer || '',
        options: options || null,
        questionType,
        skills: skills || [],
        difficulty: parseInt(difficulty) || 1,
        language: language || null,
        departmentId: departmentId || null,
        // AI-generated questions are always saved as draft first.
        // Non-admin users can request review; admin can later publish from edit flow.
        status: aiGenerated ? 'draft' : (status || 'draft'),
        testCases: testCases || null,
        createdById: access.user.id
      }
    })

    await logAudit({
      actorUserId: access.user.id,
      entityType: 'library_question',
      entityId: created.id,
      action: 'create',
      after: created,
    })

    if (aiGenerated && !isAdminReviewer) {
      await logAudit({
        actorUserId: access.user.id,
        entityType: 'library_question',
        entityId: created.id,
        action: 'update',
        metadataJson: {
          reviewRequested: true,
          requestedByRole: access.user.roleSlug,
          note: 'AI-generated question submitted for org-admin review',
        } as any,
      })
    }

    return NextResponse.json({ libraryQuestion: created, reviewRequested: !!(aiGenerated && !isAdminReviewer) }, { status: 201 })
  } catch (error) {
    console.error('Failed to create library question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
