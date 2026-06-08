import { NextResponse } from 'next/server'
import { queryOpenRouter } from '@/lib/server/ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      jobTitle, department, minExp, maxExp, skills, duration, sections 
    } = body

    const maxExpInt = parseInt(maxExp) || 0;
    let seniority = 'Junior';
    if (maxExpInt > 5) {
      seniority = 'Senior';
    } else if (maxExpInt > 2) {
      seniority = 'Mid-Level';
    }

    const systemPrompt = `You are an expert technical recruiter and assessment creator.
Your task is to generate a professional question paper for a ${seniority} level ${jobTitle} role.
Department: ${department}
Experience Required: ${minExp} to ${maxExp} years
Duration: ${duration} minutes
Core Skills: ${skills.join(', ')}

You must return ONLY valid JSON matching this schema exactly:
{
  "title": "A short engaging title for this test",
  "sections": [
    {
      "title": "Section Title",
      "questions": [
        {
          "text": "The question text, can include HTML if needed for formatting",
          "type": "MCQ", // must be "MCQ" or "SA" or "CODE"
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // Exactly 4 if type is MCQ, null otherwise
          "answer": "The correct option text for MCQ, sample expected answer for SA, or code solution for CODE. For code solutions, use \\n for newlines."
        }
      ]
    }
  ]
}

Guidelines:
- Generate NO duplicate questions across sections.
- Make sure questions are appropriate for the ${seniority} level.
- Code questions should evaluate algorithmic thinking and syntax correctness.
- For MCQ, provide exactly 4 options. The 'answer' MUST be exactly one of the options.
- The output must be parsable by JSON.parse(). DO NOT include markdown codeblocks (\`\`\`json) in the output, just the raw JSON object.`;

    const sectionRequirements = sections.map((s: any) => 
      `- ${s.title}: Generate ${s.questionCount} questions`
    ).join('\n');

    const userPrompt = `Please generate the questions according to the following section requirements:\n${sectionRequirements}`;

    let content = await queryOpenRouter({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
    
    // Remove markdown codeblock if AI adds it
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
    console.error('Failed to generate question paper:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
