import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import vm from 'node:vm'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, attemptId: string }> }
) {
  try {
    const { id, attemptId } = await props.params;

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: {
          include: { question: true }
        },
        questionPaper: true
      }
    });

    if (!attempt || attempt.questionPaperId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (!attempt.isCompleted) {
      return NextResponse.json({ error: 'Cannot evaluate incomplete attempt' }, { status: 400 });
    }

    if (attempt.isEvaluated) {
      return NextResponse.json({ success: true, message: 'Already evaluated' });
    }

    const unEvaluatedResponses = attempt.responses.filter(
      r => r.isCorrect === null && r.userAnswer
    );

    for (const r of unEvaluatedResponses) {
      try {

        if (r.question.questionType === 'CODE') {
          await evaluateCodeQuestion(r);
        } else if (r.question.questionType === 'SA') {
          await evaluateWithAI(r);
        } else {
          continue;
        }
      } catch (e) {
        console.error(`Failed to evaluate response ${r.id}`, e);
        await prisma.userResponse.update({
          where: { id: r.id },
          data: {
            isCorrect: null,
            evaluationStatus: 'manual_review',
            evaluationReason: 'Failed to automatically evaluate due to an error. Sent for manual review.'
          }
        });
      }
    }

    // Recalculate final score
    const allResponses = await prisma.userResponse.findMany({
      where: { attemptId: attempt.id }
    });

    const correctCount = allResponses.filter(r => r.isCorrect === true).length;
    const totalQuestions = attempt.questionPaper.totalQuestions;
    const newScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    await prisma.candidateTestAttempt.update({
      where: { id: attempt.id },
      data: {
        score: newScore,
        originalScore: attempt.originalScore ?? newScore,
        isEvaluated: true,
        evaluatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, newScore });
  } catch (error) {
    console.error('Failed to trigger evaluation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Judge0 language ID mapping ──
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  ruby: 72,
  rust: 73,
  csharp: 51,
}

async function judge0Submit(sourceCode: string, languageId: number, stdin: string) {
  const JUDGE0_URL = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com'
  const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || ''

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'
  }

  const submitRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin,
      cpu_time_limit: 5,
      memory_limit: 131072,
    })
  })

  if (!submitRes.ok) throw new Error(`Judge0 submission failed: ${submitRes.status}`)
  return submitRes.json() as Promise<{ stdout: string | null; stderr: string | null; status: { id: number; description: string } }>
}

async function evaluateCodeQuestion(r: any) {
  const question = r.question
  let testCases: { input: string; expectedOutput: string; isHidden: boolean }[] = []

  try {
    testCases = question.testCases
      ? (typeof question.testCases === 'string' ? JSON.parse(question.testCases) : question.testCases)
      : []
  } catch { testCases = [] }

  if (!testCases || testCases.length === 0) {
    await evaluateWithAI(r, true)
    return
  }

  try {
    const selectedLanguage = String(r.codeLanguage || '').toLowerCase()

    if (!selectedLanguage) {
      await prisma.userResponse.update({
        where: { id: r.id },
        data: {
          isCorrect: null,
          evaluationStatus: 'manual_review',
          evaluationReason: 'No programming language was selected. Sent for manual review.',
          evaluationMeta: {
            reason: 'missing_language'
          }
        }
      })
      return
    }

    if (selectedLanguage === 'javascript' || selectedLanguage === 'js') {
      const jsResult = await evaluateJavascriptFunction(r.userAnswer, testCases)
      if (jsResult !== null) {
        await prisma.userResponse.update({
          where: { id: r.id },
          data: {
            isCorrect: jsResult.isCorrect,
            evaluationStatus: 'evaluated',
            passedTestCases: jsResult.passedTestCases,
            totalTestCases: jsResult.totalTestCases,
            languageValidated: true,
            evaluationMeta: {
              language: selectedLanguage,
              evaluationMode: 'local_vm',
              testCaseBreakdown: jsResult.breakdown,
            },
            evaluationReason: jsResult.reason
          }
        })
        return
      }
    }

    const supportedLanguageId = JUDGE0_LANGUAGE_IDS[selectedLanguage]
    if (!supportedLanguageId) {
      await prisma.userResponse.update({
        where: { id: r.id },
        data: {
          isCorrect: null,
          evaluationStatus: 'manual_review',
          evaluationReason: `Selected language "${r.codeLanguage}" is not supported for auto-evaluation yet. Sent for manual review.`,
          evaluationMeta: {
            reason: 'unsupported_language',
            selectedLanguage: r.codeLanguage
          }
        }
      })
      return
    }

    let passed = 0
    const results: string[] = []

    for (const [index, tc] of testCases.entries()) {
      const execution = await judge0Submit(r.userAnswer, supportedLanguageId, tc.input)
      const actualOutput = String(execution.stdout || '').trim()
      const expectedOutput = String(tc.expectedOutput || '').trim()
      const isPass = execution.status.id === 3 && actualOutput === expectedOutput

      if (isPass) passed++
      results.push(`TC[${tc.isHidden ? 'Hidden' : 'Visible'} #${index + 1}]: ${isPass ? '✓ Pass' : `✗ Fail (Expected: ${expectedOutput}, Got: ${actualOutput || execution.stderr || execution.status.description})`}`)
    }

    const passRate = testCases.length > 0 ? passed / testCases.length : 0
    const isCorrect = passRate >= 0.5

    await prisma.userResponse.update({
      where: { id: r.id },
      data: {
        isCorrect,
        evaluationStatus: 'evaluated',
        passedTestCases: passed,
        totalTestCases: testCases.length,
        languageValidated: true,
        evaluationMeta: {
          language: selectedLanguage,
          languageId: supportedLanguageId,
          evaluationMode: 'judge0',
          passRate,
          testCaseBreakdown: results,
        },
        evaluationReason: `Code Execution: ${passed} / ${testCases.length} test cases passed (${Math.round(passRate * 100)}%).\n${results.join('\n')}`
      }
    })
  } catch (err) {
    console.error("AI Evaluation failed:", err);
    await prisma.userResponse.update({
      where: { id: r.id },
      data: {
        isCorrect: null,
        evaluationStatus: 'manual_review',
        evaluationReason: 'Automatic evaluation failed. Sent for manual review.'
      }
    })
  }
}

async function evaluateJavascriptFunction(sourceCode: string, testCases: { input: string; expectedOutput: string; isHidden: boolean }[]) {
  const functionNameMatch = sourceCode.match(/function\s+(\w+)\s*\(/)
  if (!functionNameMatch) return null

  const functionName = functionNameMatch[1]
  const sandbox: Record<string, any> = {
    console: {
      log: (...args: any[]) => {
        sandbox.__logs.push(args.join(' '))
      }
    },
    __logs: [] as string[]
  }

  try {
    vm.createContext(sandbox)
    vm.runInContext(sourceCode, sandbox, { timeout: 1000 })

    if (typeof sandbox[functionName] !== 'function') return null

    let passed = 0
    const details: string[] = []
    const breakdown: Array<{
      input: string
      expectedOutput: string
      actualOutput: string
      passed: boolean
      hidden: boolean
      strategy: string
    }> = []

    for (const testCase of testCases) {
      const expectedOutput = String(testCase.expectedOutput ?? '').trim()
      const { actualOutput, strategy } = executeJavascriptCandidate(sandbox[functionName], testCase.input)
      const normalizedOutput = normalizeEvaluationOutput(actualOutput)
      const isPass = outputsMatch(normalizedOutput, expectedOutput)
      if (isPass) passed++
      breakdown.push({
        input: testCase.input,
        expectedOutput,
        actualOutput: normalizedOutput,
        passed: isPass,
        hidden: testCase.isHidden,
        strategy,
      })
      details.push(`TC[${testCase.isHidden ? 'Hidden' : 'Visible'}]: ${isPass ? '✓ Pass' : `✗ Fail (Expected: ${expectedOutput}, Got: ${normalizedOutput})`}`)
    }

    const passRate = testCases.length > 0 ? passed / testCases.length : 0
    return {
      isCorrect: passRate >= 0.5,
      passedTestCases: passed,
      totalTestCases: testCases.length,
      breakdown,
      reason: `JS Execution: ${passed} / ${testCases.length} test cases passed (${Math.round(passRate * 100)}%).\n${details.join('\n')}`
    }
  } catch {
    return null
  }
}

function normalizeEvaluationOutput(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  if (Array.isArray(value)) return JSON.stringify(value).trim()
  if (typeof value === 'object') return JSON.stringify(value).trim()
  return String(value).trim()
}

function parseCandidateInput(input: string) {
  const trimmed = String(input ?? '').trim()
  if (!trimmed) return { raw: input, parsed: input, variants: [input] }

  const variants: any[] = [trimmed, input]

  try {
    const parsed = JSON.parse(trimmed)
    variants.unshift(parsed)
    if (Array.isArray(parsed)) variants.push(...parsed)
    return { raw: input, parsed, variants }
  } catch {
    const splitLines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    if (splitLines.length > 1) variants.push(splitLines)
    return { raw: input, parsed: trimmed, variants }
  }
}

function executeJavascriptCandidate(candidateFn: (...args: any[]) => any, input: string) {
  const parsedInput = parseCandidateInput(input)
  const attempts: Array<{ strategy: string; args: any[] }> = [
    { strategy: 'single_parsed_arg', args: [parsedInput.parsed] },
    { strategy: 'single_raw_arg', args: [parsedInput.raw] },
    { strategy: 'spread_parsed_array', args: Array.isArray(parsedInput.parsed) ? parsedInput.parsed : [] },
    { strategy: 'spread_line_array', args: parsedInput.variants.find(v => Array.isArray(v)) || [] },
    { strategy: 'no_args', args: [] },
  ]

  for (const attempt of attempts) {
    try {
      const result = candidateFn(...attempt.args)
      return {
        actualOutput: result,
        strategy: attempt.strategy,
      }
    } catch {
      continue
    }
  }

  return {
    actualOutput: '',
    strategy: 'execution_failed',
  }
}

function outputsMatch(actual: string, expected: string) {
  if (actual === expected) return true

  const normalizedActual = actual.replace(/\s+/g, ' ').trim()
  const normalizedExpected = expected.replace(/\s+/g, ' ').trim()
  if (normalizedActual === normalizedExpected) return true

  try {
    const actualJson = JSON.parse(actual)
    const expectedJson = JSON.parse(expected)
    return JSON.stringify(actualJson) === JSON.stringify(expectedJson)
  } catch {
    return false
  }
}

async function evaluateWithAI(r: any, isCode = false) {
  const prompt = isCode
    ? `You are an expert code reviewer evaluating a candidate's coding solution.

Problem Statement:
${r.question.text}

Reference Solution (for context only – the candidate may use any correct approach):
${r.question.answer}

Candidate's Code:
${r.userAnswer}

Instructions:
- Focus on whether the candidate's code correctly solves the problem, NOT whether it matches the reference solution.
- A different algorithm or coding style that produces the correct output should be marked as correct.
- Check for logical correctness, correct return value, and that the function signature matches what is asked.
- Ignore minor style differences, variable names, or extra whitespace.
- Only mark incorrect if the logic is fundamentally wrong or the function would return wrong results.

Return a boolean 'isCorrect' and a brief 'reason' explaining your decision.`
    : `You are an expert technical interviewer evaluating a candidate's answer.
Question:
${r.question.text}

Expected Ideal Answer / Criteria:
${r.question.answer}

Candidate's Answer:
${r.userAnswer}

Determine if the candidate's answer is correct or conceptually sound compared to the expected answer.
Return a boolean 'isCorrect' and a brief 'reason' explaining why.`

  const evaluation = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: z.object({ isCorrect: z.boolean(), reason: z.string() }),
    prompt
  })

  await prisma.userResponse.update({
    where: { id: r.id },
    data: {
      isCorrect: evaluation.object.isCorrect,
      evaluationStatus: 'evaluated',
      languageValidated: false,
      evaluationReason: evaluation.object.reason
    }
  })
}
