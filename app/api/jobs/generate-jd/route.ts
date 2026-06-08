import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getTenantContext } from '@/lib/server/tenantContext'
import { z } from 'zod'

const generateSchema = z.object({
  title: z.string().min(2),
  skills: z.array(z.string()).optional(),
  experience: z.string().optional(),
})

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = generateSchema.parse(await req.json())

    const prompt = `You are an expert HR recruiter. Write a professional, engaging, and well-structured Job Description for the following position:
    
Job Title: ${payload.title}
Experience Level: ${payload.experience || 'Not specified'}
Required Skills: ${(payload.skills || []).join(', ') || 'Not specified'}

The job description should be formatted in HTML (using tags like <h2>, <ul>, <li>, <p>, <strong>) so it can be directly rendered in a rich text editor. Do NOT wrap the HTML in markdown code blocks like \`\`\`html.
Include the following sections:
1. About the Role
2. Key Responsibilities
3. Requirements & Qualifications
4. What We Offer
`

    const { text } = await generateText({
      model: openrouter('openai/gpt-4o-mini'), // You can change this to any OpenRouter model
      prompt: prompt,
    })

    return NextResponse.json({ generatedHtml: text })

  } catch (error: any) {
    console.error('JD Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate JD' }, { status: 500 })
  }
}
