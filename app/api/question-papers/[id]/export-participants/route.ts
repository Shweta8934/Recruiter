import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { requireTenantAccess } from '@/lib/server/tenantGuard';

function escapeCSV(value: any) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    });

    if (!paper) {
      return new NextResponse("Question Paper Not Found", { status: 404 });
    }
    const access = await requireTenantAccess(paper.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const shortlist = url.searchParams.get('shortlist');

    const attemptWhere: any = { questionPaperId: id };

    if (status === 'pass') {
      attemptWhere.isCompleted = true;
      attemptWhere.score = { gte: paper.cutoffScore };
    } else if (status === 'fail') {
      attemptWhere.isCompleted = true;
      attemptWhere.score = { lt: paper.cutoffScore };
    } else if (status === 'pending') {
      attemptWhere.isCompleted = false;
    }

    if (shortlist === 'yes') {
      attemptWhere.isShortlisted = true;
    } else if (shortlist === 'no') {
      attemptWhere.isShortlisted = false;
    }

    const attempts = await prisma.candidateTestAttempt.findMany({
      where: attemptWhere,
      orderBy: { createdAt: 'desc' }
    });

    const headers = [
      "Candidate Name",
      "Email",
      "Phone",
      "Status",
      "Flagged For Review",
      "Score",
      "Proctoring Score",
      "Total Violations",
      "Is Shortlisted",
      "Date Taken"
    ];

    const rows = attempts.map(attempt => {
      let statusText = 'Pending';
      if (attempt.isCompleted) {
        statusText = (attempt.score || 0) >= (paper.cutoffScore || 0) ? 'Pass' : 'Fail';
      }

      return [
        attempt.candidateName,
        attempt.email,
        attempt.phone || '-',
        statusText,
        attempt.isFlaggedForReview ? 'Yes' : 'No',
        attempt.isCompleted ? `${attempt.score}%` : 'N/A',
        attempt.proctoringScore,
        attempt.totalViolations,
        attempt.isShortlisted ? 'Yes' : 'No',
        new Date(attempt.createdAt).toLocaleDateString()
      ].map(escapeCSV).join(',');
    });

    const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="participants-${id}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export participants error:", error);
    return new NextResponse("Failed to export participants", { status: 500 });
  }
}
