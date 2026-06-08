import { NextResponse } from 'next/server'
import { queryOpenRouter } from '@/lib/server/ai'

export async function POST(request: Request) {
  try {
    const { jobTitle, department } = await request.json()

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job Title is required' }, { status: 400 })
    }

    const rawOutput = await queryOpenRouter({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert HR assistant. Given a job title and department, suggest a comma-separated list of 5-8 relevant technical and soft skills. Do not include extra text, just the comma-separated list. Example: React, TypeScript, Node.js, Communication, System Design."
        },
        {
          role: "user",
          content: `Job Title: ${jobTitle}\nDepartment: ${department || 'Not specified'}`
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    })
    const skills = rawOutput.split(',').map((s: string) => s.trim()).filter(Boolean)

    return NextResponse.json({ skills })
  } catch (error) {
    console.error('Failed to suggest skills:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
