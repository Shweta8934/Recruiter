import { NextResponse } from 'next/server'
import { queryOpenRouter } from '@/lib/server/ai'

export async function POST(request: Request) {
  try {
    const { code, language, testCases } = await request.json()

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language are required' }, { status: 400 })
    }

    if (testCases && Array.isArray(testCases) && testCases.length > 0) {
      const prompt = `You are a strict code executor/compiler for the ${language} programming language.
I will provide you with a snippet of code and multiple standard inputs (stdin).
Your job is to SIMULATE executing this code against EACH standard input separately.
For each input, return ONLY the exact standard output (stdout).
Format your response as a strict JSON array of strings, where each string is the exact stdout output for the corresponding input in order. DO NOT output anything else except the JSON array.

CODE:
${code}

INPUTS:
${testCases.map((tc: any, i: number) => `Input ${i + 1}:\n${tc.input}`).join('\n\n')}
`

      let output = await queryOpenRouter({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1
      })

      if (output.startsWith('```')) {
        output = output.replace(/^```[a-z]*\n/, '').replace(/```$/, '').trim();
      }

      try {
        const resultsArray = JSON.parse(output);
        const testCaseResults = testCases.map((tc, index) => {
          const actualOutput = resultsArray[index] || '';
          const passed = actualOutput.trim() === tc.expectedOutput.trim();
          return {
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput,
            passed
          }
        });
        return NextResponse.json({ testCaseResults })
      } catch(e) {
        return NextResponse.json({ error: 'Simulation engine failed to parse test case results', rawOutput: output }, { status: 500 })
      }
    }

    const prompt = `You are a strict code executor/compiler for the ${language} programming language.
I will provide you with a snippet of code. 
Your job is to SIMULATE executing this code and return ONLY the exact standard output (stdout).
If the code contains a syntax error, runtime error, or compilation error, return the exact error message that the compiler/interpreter would throw.
DO NOT wrap the output in markdown code blocks. DO NOT provide any explanations. JUST output the simulated console output or error.

CODE:
${code}`

    let output = await queryOpenRouter({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.1
    })

    if (output.startsWith('```')) {
      output = output.replace(/^```[a-z]*\n/, '').replace(/```$/, '').trim();
    }

    return NextResponse.json({ output })

  } catch (error) {
    console.error('Failed to execute code:', error)
    return NextResponse.json({ error: 'Failed to execute code' }, { status: 500 })
  }
}
