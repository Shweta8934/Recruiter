import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getSessionUser } from '@/lib/server/tenantGuard'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY,
})

const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  explainability: z.object({
    matchedSkills: z.array(z.string()).min(1).max(5),
    relevantExperience: z.array(z.string()).min(1).max(3),
    educationFit: z.array(z.string()).min(1).max(3),
  }),
  topGaps: z.array(z.string()).min(1).max(5),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string, appId: string }> }) {
  try {
    const { id, appId } = await params

    const application = await prisma.jobApplication.findUnique({
      where: { id: appId },
      include: { job: true }
    })

    if (!application || !application.job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!application.job.isAiScreeningEnabled) {
      return NextResponse.json({ message: 'AI Screening disabled for this job' })
    }

    const jd = application.job.description || ''
    const skills = application.job.skills ? JSON.stringify(application.job.skills) : ''

    const prompt = `You are an expert technical recruiter. Evaluate the following candidate against the Job Description and required skills.
    
Job Description:
${jd}

Required Skills:
${skills}

Candidate Parsed Skills:
${JSON.stringify(application.parsedSkills)}

Candidate Work History:
${JSON.stringify(application.parsedWorkHistory)}

Candidate Education:
${JSON.stringify(application.parsedEducation)}

Candidate Projects:
${JSON.stringify(application.parsedProjects)}

Candidate Certificates & Achievements:
${JSON.stringify({ certificates: application.parsedCertificates, achievements: application.parsedAchievements })}

Candidate Summary:
${application.parsedSummary || 'None'}

Evaluate the candidate and provide:
1. A match score from 0 to 100.
2. Explainability with three buckets:
   - matchedSkills: concrete matched JD skills
   - relevantExperience: years/domain/role relevance
   - educationFit: degree/education alignment
3. Top gaps: missing skills/experience/education concerns.
`

    const { object } = await generateObject({
      model: openrouter('openai/gpt-4o-mini'),
      schema: scoreSchema,
      prompt: prompt,
    })

    const explainability = {
      reasons: [
        ...object.explainability.matchedSkills,
        ...object.explainability.relevantExperience,
        ...object.explainability.educationFit,
      ],
      matchedSkills: object.explainability.matchedSkills,
      relevantExperience: object.explainability.relevantExperience,
      educationFit: object.explainability.educationFit,
      gaps: object.topGaps,
    }

    const updated = await prisma.jobApplication.update({
      where: { id: appId },
      data: {
        aiScore: object.score,
        aiExplainability: explainability,
        aiModelVersion: 'gpt-4o-mini',
        aiPromptVersion: 'v1.0'
      }
    })

    const sessionUser = await getSessionUser()

    await prisma.auditLog.create({
      data: {
        actorUserId: sessionUser?.id || null,
        entityType: 'job_application',
        entityId: appId,
        action: 'ai_screening_scored',
        beforeJson: null,
        afterJson: {
          aiScore: updated.aiScore,
          aiModelVersion: updated.aiModelVersion,
          aiPromptVersion: updated.aiPromptVersion,
          aiExplainability: updated.aiExplainability,
        },
        metadataJson: {
          jobId: id,
          advisoryOnly: true,
        },
      },
    })

    return NextResponse.json({ success: true, score: object.score })
  } catch (error: any) {
    console.error('AI Scoring Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to score application' }, { status: 500 })
  }
}
