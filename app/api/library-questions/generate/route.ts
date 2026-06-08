import { NextResponse } from 'next/server'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { OpenRouterHttpError, queryOpenRouter } from '@/lib/server/ai'

const ALLOWED_ROLES = ['org-admin', 'hr', 'recruiter', 'super-admin']

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, skill, difficulty, questionType, count = 3 } = body

    if (!organizationId || !skill || !questionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    if (!access.user.roleSlug || !ALLOWED_ROLES.includes(access.user.roleSlug)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to generate library questions.' }, { status: 403 })
    }

    const systemPrompt = `You are an expert technical recruiter and assessment creator.
Your task is to generate ${count} candidate questions for a Question Library.
Skill/Topic: ${skill}
Difficulty: ${difficulty}/5 (1 is beginner, 5 is expert)
Question Type: ${questionType}

You must return ONLY valid JSON matching this schema exactly:
{
  "questions": [
    {
      "text": "The question text, can include HTML if needed for formatting",
      "type": "${questionType}",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // Exactly 4 if type is MCQ, null otherwise
      "answer": "The correct option text for MCQ, expected answer for SA, or code solution for CODE",
      "testCases": [ // Only if type is CODE, else null
         { "input": "...", "expectedOutput": "...", "isHidden": false }
      ]
    }
  ]
}

Guidelines:
- Generate exactly ${count} unique questions.
- Match the difficulty level specified.
- If type is MCQ, provide exactly 4 options and the answer must be exactly one of them.
- If type is CODE, provide 2-3 testCases (at least one hidden).
- The output must be parsable by JSON.parse(). DO NOT include markdown codeblocks, just the raw JSON object.`;

    let content = await queryOpenRouter({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the questions now.' }
      ],
      temperature: 0.7,
      max_tokens: 1200
    })
    
    // Clean up potential markdown
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI JSON:', content);
      return NextResponse.json({ error: 'AI returned invalid JSON format' }, { status: 500 })
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Failed to generate library questions:', error)
    if (error instanceof OpenRouterHttpError && error.status === 402) {
      return NextResponse.json(
        { error: 'AI credits are insufficient for this request. Please top up OpenRouter credits or try generating fewer/smaller questions.' },
        { status: 402 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
