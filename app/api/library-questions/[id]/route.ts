import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { logAudit } from '@/lib/server/audit'
import { z } from 'zod'

const ALLOWED_ROLES = ['org-admin', 'hr', 'recruiter', 'super-admin']
const REVIEW_ROLES = ['org-admin']

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!access.user.roleSlug || !ALLOWED_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view library questions.' }, { status: 403 })
    }

    const question = await prisma.libraryQuestion.findUnique({
      where: { id, organizationId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json({ libraryQuestion: question })
  } catch (error) {
    console.error('Failed to fetch library question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json()
    const { 
      organizationId, text, answer, options, questionType, 
      skills, difficulty, language, testCases, departmentId, status
    } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!access.user.roleSlug || !ALLOWED_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to update library questions.' }, { status: 403 })
    }

    const existing = await prisma.libraryQuestion.findUnique({
      where: { id, organizationId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    const finalType = questionType !== undefined ? questionType : existing.questionType
    const finalSkills = skills !== undefined ? skills : existing.skills
    const finalDepartmentId = departmentId !== undefined ? departmentId : existing.departmentId
    const finalDifficulty = difficulty !== undefined ? parseInt(difficulty) : existing.difficulty
    const finalLanguage = language !== undefined ? language : existing.language
    const finalOptions = options !== undefined ? options : existing.options
    const finalAnswer = answer !== undefined ? answer : existing.answer

    if (!finalSkills || !Array.isArray(finalSkills) || finalSkills.length === 0) {
      return NextResponse.json({ error: 'At least one skill is required.' }, { status: 400 })
    }
    if (!finalDepartmentId) {
      return NextResponse.json({ error: 'Department is required.' }, { status: 400 })
    }
    if (!finalDifficulty || Number(finalDifficulty) < 1 || Number(finalDifficulty) > 5) {
      return NextResponse.json({ error: 'Difficulty must be between 1 and 5.' }, { status: 400 })
    }
    if (finalType === 'CODE' && !finalLanguage) {
      return NextResponse.json({ error: 'Coding language is required for CODE questions.' }, { status: 400 })
    }
    if (finalType === 'MCQ') {
      const validOptions = (finalOptions || []).filter((o: string) => String(o).trim() !== '')
      if (validOptions.length < 2) {
        return NextResponse.json({ error: 'MCQ requires at least two options.' }, { status: 400 })
      }
      if (!finalAnswer || String(finalAnswer).trim() === '') {
        return NextResponse.json({ error: 'MCQ answer is required.' }, { status: 400 })
      }
    }

    const updated = await prisma.libraryQuestion.update({
      where: { id },
      data: {
        text: text !== undefined ? text : existing.text,
        answer: answer !== undefined ? answer : existing.answer,
        options: options !== undefined ? options : existing.options,
        questionType: questionType !== undefined ? questionType : existing.questionType,
        skills: skills !== undefined ? skills : existing.skills,
        difficulty: difficulty !== undefined ? parseInt(difficulty) : existing.difficulty,
        language: language !== undefined ? language : existing.language,
        departmentId: departmentId !== undefined ? departmentId : existing.departmentId,
        status: status !== undefined ? status : existing.status,
        testCases: testCases !== undefined ? testCases : existing.testCases,
      }
    })

    await logAudit({
      actorUserId: access.user.id,
      entityType: 'library_question',
      entityId: updated.id,
      action: 'update',
      before: existing,
      after: updated,
    })

    return NextResponse.json({ libraryQuestion: updated })
  } catch (error) {
    console.error('Failed to update library question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const reviewStatusSchema = z.object({
  organizationId: z.string().min(1),
  status: z.enum(['draft', 'published']),
  reason: z.string().optional(),
})

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const body = await request.json()
    const parsed = reviewStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { organizationId, status, reason } = parsed.data
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!access.user.roleSlug || !REVIEW_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: Only org-admin can approve or reject questions.' }, { status: 403 })
    }

    const existing = await prisma.libraryQuestion.findUnique({
      where: { id, organizationId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const updated = await prisma.libraryQuestion.update({
      where: { id },
      data: { status }
    })

    await logAudit({
      actorUserId: access.user.id,
      entityType: 'library_question',
      entityId: id,
      action: 'update',
      before: { status: existing.status },
      after: { status, reason: reason || null },
    })

    return NextResponse.json({ libraryQuestion: updated })
  } catch (error) {
    console.error('Failed to update library question review status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!access.user.roleSlug || !ALLOWED_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete library questions.' }, { status: 403 })
    }

    const existing = await prisma.libraryQuestion.findUnique({
      where: { id, organizationId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await prisma.libraryQuestion.delete({
      where: { id }
    })

    await logAudit({
      actorUserId: access.user.id,
      entityType: 'library_question',
      entityId: id,
      action: 'delete',
      before: existing,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete library question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
