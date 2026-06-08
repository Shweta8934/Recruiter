import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

function escapeCSV(value: any) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: Request, props: { params: Promise<{ id: string, attemptId: string }> }) {
  try {
    const params = await props.params;
    const { id, attemptId } = params;

    const attempt = await prisma.candidateTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        questionPaper: {
          include: {
            sections: {
              include: { questions: true }
            }
          }
        },
        responses: {
          include: { question: true }
        },
        violations: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!attempt || attempt.questionPaperId !== id) {
      return new NextResponse("Attempt Not Found", { status: 404 });
    }

    const lines: string[] = [];

    // Section 1: Overview
    lines.push(escapeCSV("Candidate Test Report"));
    lines.push([escapeCSV("Candidate Name"), escapeCSV(attempt.candidateName)].join(','));
    lines.push([escapeCSV("Email"), escapeCSV(attempt.email)].join(','));
    lines.push([escapeCSV("Phone"), escapeCSV(attempt.phone || '-')].join(','));
    lines.push([escapeCSV("Date Taken"), escapeCSV(new Date(attempt.createdAt).toLocaleString())].join(','));
    lines.push([escapeCSV("Status"), escapeCSV(attempt.isCompleted ? ((attempt.score || 0) >= attempt.questionPaper.cutoffScore ? 'PASS' : 'FAIL') : 'PENDING')].join(','));
    lines.push([escapeCSV("Final Score"), escapeCSV(`${attempt.score || 0}%`)].join(','));
    lines.push([escapeCSV("Proctoring Score"), escapeCSV(`${attempt.proctoringScore}/100`)].join(','));
    lines.push("");

    // Section 2: Questions & Responses
    lines.push(escapeCSV("Question Responses"));
    lines.push([
      "Section",
      "Question",
      "Type",
      "Expected Answer",
      "Candidate Answer",
      "Result",
      "Evaluation Reason"
    ].map(escapeCSV).join(','));

    for (const section of attempt.questionPaper.sections) {
      for (const question of section.questions) {
        const response = attempt.responses.find(r => r.questionId === question.id);
        const result = response ? (response.isCorrect ? 'Correct' : 'Incorrect') : 'Not Attempted';
        
        // Basic HTML strip for question text
        const plainTextQuestion = question.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        lines.push([
          section.title,
          plainTextQuestion,
          question.type,
          question.answer,
          response?.userAnswer || '',
          result,
          response?.evaluationReason || ''
        ].map(escapeCSV).join(','));
      }
    }

    lines.push("");

    // Section 3: Violations
    lines.push(escapeCSV("Proctoring Violations"));
    lines.push([
      "Timestamp",
      "Type",
      "Description"
    ].map(escapeCSV).join(','));

    if (attempt.violations.length === 0) {
      lines.push(escapeCSV("No violations recorded"));
    } else {
      for (const violation of attempt.violations) {
        lines.push([
          new Date(violation.timestamp).toLocaleString(),
          violation.violationType,
          violation.description
        ].map(escapeCSV).join(','));
      }
    }

    return new NextResponse(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${attempt.candidateName.replace(/\s+/g, '_')}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export report error:", error);
    return new NextResponse("Failed to export report", { status: 500 });
  }
}
