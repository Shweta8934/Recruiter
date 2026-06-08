import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { queryOpenRouter } from '@/lib/server/ai'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params;
    const body = await request.json()
    const { image } = body

    if (!image) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI/OpenRouter API key is missing' }, { status: 500 })
    }

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId }
    })

    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.isCompleted) {
      return NextResponse.json({ error: 'Test already completed' }, { status: 400 })
    }

    // Call OpenRouter with GPT-4o for face detection
    let content = await queryOpenRouter({
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this photo taken from the candidate\'s webcam. Determine if a clear, visible human face is present in the frame. Respond ONLY with a valid JSON object matching this schema exactly: { "faceDetected": boolean, "reason": "A brief explanation of why face detection succeeded or failed." }. Do not include markdown code block formatting (```json) in your response, return the raw JSON object.'
            },
            {
              type: 'image_url',
              image_url: {
                url: image
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: "json_object" }
    })

    // Remove markdown formatting if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(content)
    const { faceDetected, reason } = parsed

    return NextResponse.json({
      success: true,
      faceDetected: !!faceDetected,
      reason: reason || (faceDetected ? "Face detected successfully" : "No face detected in the frame")
    })

  } catch (error) {
    console.error('Failed to verify face:', error)
    return NextResponse.json({ error: 'Internal server error during face verification' }, { status: 500 })
  }
}
