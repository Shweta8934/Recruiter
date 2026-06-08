import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/PageContainer'
import { PageHeader } from '@/components/common/PageHeader'
import { DashboardLayout } from '@/components/layout'
import { BackButton } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkillBadgeList } from '@/components/question-papers/SkillBadgeList'
import { FileText, Clock, Users, Calendar, Filter } from 'lucide-react'
import { prisma } from '@/lib/server/prisma'
import { ParticipantFilters } from '@/components/question-papers/ParticipantFilters'

export default async function QuestionPaperDetail(props: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ status?: string, shortlist?: string, page?: string }>
}) {
  const parseOptions = (raw: any) => {
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      return raw
    }
  }

  const renderAnswer = (q: any) => {
    if (q.questionType !== 'MCQ') return q.answer
    const optionsPayload = parseOptions(q.options)
    const mcqMode = optionsPayload?.mcqMode || 'single'
    if (mcqMode === 'multi') {
      return String(q.answer || '').split('||').filter(Boolean).join(', ')
    }
    return q.answer
  }

  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const { status, shortlist, page } = searchParams;

  const pageNum = parseInt(page || '1', 10) || 1;
  const pageSize = 5;
  const skip = (pageNum - 1) * pageSize;
  const paper = await prisma.questionPaper.findUnique({
    where: { id },
    include: {
      sections: {
        include: { questions: true }
      }
    }
  })

  if (!paper || !paper.isActive) {
    notFound()
  }

  // Build the dynamic where clause based on query parameters
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

  const [totalCount, testAttempts] = await Promise.all([
    prisma.candidateTestAttempt.count({ where: attemptWhere }),
    prisma.candidateTestAttempt.findMany({
      where: attemptWhere,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    })
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!paper || !paper.isActive) {
    notFound()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton href="/question-papers" />
          <PageHeader title={paper.title} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-8">
          <div>
            <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[220px] h-full">
              <h2 className="text-xl font-semibold mb-4">Assessment Details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1">Job Role</dt>
                  <dd className="font-medium text-base">{paper.jobTitle}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Department</dt>
                  <dd className="font-medium text-base">{paper.departmentName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Experience Required</dt>
                  <dd className="font-medium">{paper.minExp} - {paper.maxExp} years</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Skills</dt>
                  <dd className="font-medium">
                    <SkillBadgeList skills={paper.skillsList.split(',').map(s => s.trim()).filter(Boolean)} />
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div>
            <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[220px] h-full">
              <h3 className="font-semibold mb-4 text-lg">Test Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-foreground">Duration</div>
                    <div className="text-sm">{paper.duration} minutes</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <FileText className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-foreground">Total Questions</div>
                    <div className="text-sm">{paper.totalQuestions} questions</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <FileText className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-foreground">Paper Lifecycle</div>
                    <div className="text-sm capitalize">{paper.status || 'draft'}</div>
                  </div>
                </div>
                {/* <div className="flex items-center gap-3 text-muted-foreground">
                  <Filter className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-foreground">Randomization</div>
                    <div className="text-sm">
                      Questions: {paper.randomizeQuestions ? 'On' : 'Off'} | Options: {paper.randomizeOptions ? 'On' : 'Off'}
                    </div>
                  </div>
                </div> */}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-foreground">Link Expiry</div>
                    <div className="text-sm">{paper.linkExpiresAt ? new Date(paper.linkExpiresAt).toLocaleString() : 'No expiry set'}</div>
                  </div>
                </div>
                {/* <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-foreground">Proctor Threshold</div>
                    <div className="text-sm">{paper.proctorViolationThreshold ?? 5} violations</div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Question Sections</h3>
            {paper.sections.map((section, idx) => (
              <div key={section.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-muted px-6 py-3 border-b flex justify-between items-center">
                  <h4 className="font-semibold">{section.title}</h4>
                  <div className="text-sm text-muted-foreground flex gap-4">
                    <span>{section.questions.length} Questions</span>
                    <span>{section.weightage}% Weight</span>
                  </div>
                </div>
                <div className="divide-y">
                  {section.questions.map((q, qIdx) => (
                    <div key={q.id} className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col gap-2 mt-1">
                          <Badge variant="outline">Q{qIdx + 1}</Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {q.questionType === 'MCQ' ? 'MCQ' : q.questionType === 'CODE' ? 'CODE' : 'SHORT ANSWER'}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div dangerouslySetInnerHTML={{ __html: q.text }} className="prose prose-sm max-w-none mb-4" />
                          {q.questionType === 'MCQ' && q.options && (
                            <ul className="space-y-2 mb-4">
                              {(Array.isArray(parseOptions(q.options)) ? parseOptions(q.options) : parseOptions(q.options)?.items || []).map((opt: string, oIdx: number) => (
                                <li key={oIdx} className="flex items-center gap-2 text-sm">
                                  <div className="w-4 h-4 rounded-full border border-primary/50 flex-shrink-0" />
                                  <span>{opt}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="bg-muted/50 p-3 rounded-md border text-sm">
                            <span className="font-semibold text-muted-foreground mr-2">Answer:</span>
                            <span className="font-mono">{renderAnswer(q)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
              <h3 className="text-lg font-semibold">Participants ({totalCount})</h3>
              <div className="flex items-center gap-3">
                <ParticipantFilters />
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/question-papers/${paper.id}/export-participants?status=${status || ''}&shortlist=${shortlist || ''}`} download>
                    <FileText className="w-4 h-4 mr-2" />
                    Export CSV
                  </a>
                </Button>
              </div>
            </div>
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              {testAttempts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>No candidates have registered or taken this test yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">Candidate</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Review</th>
                        <th className="px-6 py-3 font-medium">Score</th>
                        <th className="px-6 py-3 font-medium">Shortlist</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {testAttempts.map((attempt) => {
                        let statusText = 'Pending';
                        let statusBadge = 'bg-yellow-100 text-yellow-800';

                        if (attempt.isCompleted) {
                          const cutoff = paper.cutoffScore || 0;
                          const score = attempt.score || 0;
                          if (score >= cutoff) {
                            statusText = 'Pass';
                            statusBadge = 'bg-primary/10 text-primary';
                          } else {
                            statusText = 'Fail';
                            statusBadge = 'bg-red-100 text-red-800';
                          }
                        }

                        return (
                          <tr key={attempt.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-foreground">{attempt.candidateName}</div>
                              <div className="text-muted-foreground text-xs mt-0.5">{attempt.email}</div>
                              {attempt.phone && <div className="text-muted-foreground text-xs">{attempt.phone}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className={statusBadge}>
                                {statusText}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {attempt.isFlaggedForReview ? (
                                <Badge variant="outline" className="border-amber-400 text-amber-700">Flagged</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Clean</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono font-medium">
                              {attempt.isCompleted ? `${attempt.score}%` : '--'}
                            </td>
                            <td className="px-6 py-4">
                              {attempt.isShortlisted ? (
                                <Badge variant="default" className="bg-primary text-primary-foreground">Shortlisted</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">--</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(attempt.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {attempt.isCompleted && (
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/question-papers/${paper.id}/attempts/${attempt.id}`}>View Report</Link>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                  <div className="text-sm text-muted-foreground">
                    Showing {skip + 1} to {Math.min(skip + pageSize, totalCount)} of {totalCount}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pageNum <= 1} asChild={pageNum > 1}>
                      {pageNum > 1 ? (
                        <Link href={`?status=${status || 'all'}&shortlist=${shortlist || 'all'}&page=${pageNum - 1}`}>Previous</Link>
                      ) : (
                        <span>Previous</span>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" disabled={pageNum >= totalPages} asChild={pageNum < totalPages}>
                      {pageNum < totalPages ? (
                        <Link href={`?status=${status || 'all'}&shortlist=${shortlist || 'all'}&page=${pageNum + 1}`}>Next</Link>
                      ) : (
                        <span>Next</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
