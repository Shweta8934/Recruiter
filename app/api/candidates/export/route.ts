import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

function escapeCSV(value: any) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get('organizationId');
    const jobId = url.searchParams.get('jobId');

    if (!orgId) {
      return new NextResponse("Organization ID required", { status: 400 });
    }

    const whereClause: any = {
      job: {
        organizationId: orgId
      }
    };

    if (jobId && jobId !== 'all') {
      whereClause.jobId = jobId;
    }

    const candidates = await prisma.jobApplication.findMany({
      where: whereClause,
      include: {
        job: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const headers = [
      "Candidate Name",
      "Email",
      "Job Post",
      "Status",
      "Experience (Years)",
      "Location",
      "Current CTC",
      "Expected CTC",
      "Notice Period",
      "Applied On"
    ];

    const rows = candidates.map(c => [
      c.fullName,
      c.email,
      c.job.title,
      c.status.replace('_', ' ').toUpperCase(),
      c.yearsExperience || '-',
      c.location || '-',
      c.currentCompany || '-',
      c.expectedCtc || '-',
      c.noticePeriod || '-',
      new Date(c.createdAt).toLocaleDateString()
    ].map(escapeCSV).join(','));

    const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="candidates.csv"`,
      },
    });
  } catch (error) {
    console.error("Export candidates error:", error);
    return new NextResponse("Failed to export candidates", { status: 500 });
  }
}
