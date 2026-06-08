import { notFound } from 'next/navigation'
import { prisma } from '@/lib/server/prisma'
import { getSessionUser, assertTenantMembership } from '@/lib/server/tenantGuard'
import { DashboardLayout } from '@/components/layout'
import { PageHeader } from '@/components/common/PageHeader'
import { BackButton } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { AttemptReportClient } from '@/components/question-papers/AttemptReportClient'
import { ExportPdfButton } from '@/components/question-papers/ExportPdfButton'
import { ScoreOverrideCard } from '@/components/question-papers/ScoreOverrideCard'

export default async function AttemptReportPage(props: { params: Promise<{ id: string, attemptId: string }> }) {
  const { id, attemptId } = await props.params;

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
    notFound();
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    notFound();
  }

  // Assert tenant membership
  const paperOrgId = attempt.questionPaper.organizationId;
  const isAllowed = sessionUser.roleSlug === 'super-admin' || (paperOrgId ? await assertTenantMembership(sessionUser.id, paperOrgId) : false);
  if (!isAllowed) {
    notFound();
  }

  // Interviewers can access only candidates explicitly assigned to them.
  if (sessionUser.roleSlug === 'interviewer') {
    if (!attempt.jobApplicationId) {
      notFound();
    }
    const assignmentLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'job_application',
        entityId: attempt.jobApplicationId,
        action: 'interview_assigned',
      },
      select: { id: true, actorUserId: true, metadataJson: true },
      orderBy: { createdAt: 'desc' },
    });
    const hasAssignment = assignmentLogs.some((log: any) => {
      const meta = (log.metadataJson || {}) as any
      return meta.assignedInterviewerUserId === sessionUser.id || log.actorUserId === sessionUser.id
    })
    if (!hasAssignment) {
      notFound();
    }
  }

  const mobileFeeds = attempt.violations.filter(v => v.violationType === 'MOBILE_FEED');
  const mainViolations = attempt.violations.filter(v => v.violationType !== 'MOBILE_FEED');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="print:hidden">
            <BackButton href={`/question-papers/${id}`} />
          </div>
          <PageHeader title={`${attempt.candidateName}'s Test Report`}>
            <div className="print:hidden">
              {attempt.isCompleted && <ExportPdfButton />}
            </div>
          </PageHeader>
        </div>

        <div id="printable-report-area" className="w-full">
          <div className="hidden pdf-only mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-foreground">{attempt.candidateName}'s Test Report</h1>
              <p className="text-muted-foreground text-sm">Assessment: {attempt.questionPaper.title}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Left Column: Responses */}
            <div className="col-span-2 space-y-6">
              <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-6">Answers Overview</h2>
                
                <div className="space-y-8">
                  {attempt.questionPaper.sections.map(section => (
                    <div key={section.id} className="space-y-4">
                      <h3 className="text-lg font-bold border-b pb-2">{section.title}</h3>
                      {section.questions.map((q, qIdx) => {
                        const response = attempt.responses.find(r => r.questionId === q.id);
                        
                        return (
                          <div key={q.id} className="border rounded-lg p-5 bg-muted/30">
                            <div className="flex gap-4 mb-4">
                              <Badge variant="outline">Q{qIdx + 1}</Badge>
                              <div className="flex-1">
                                <div dangerouslySetInnerHTML={{ __html: q.text }} className="prose prose-sm max-w-none" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 ml-12">
                              <div>
                                <span className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Expected Answer:</span>
                                <div className="bg-muted p-3 rounded text-sm font-mono">{q.answer}</div>
                              </div>
                              <div>
                                <span className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Candidate's Answer:</span>
                                <div className="bg-background border p-3 rounded text-sm">
                                  {response?.userAnswer ? (
                                    <pre className="whitespace-pre-wrap font-sans">{response.userAnswer}</pre>
                                  ) : (
                                    <span className="text-muted-foreground italic">Not attempted</span>
                                  )}
                                </div>
                              </div>
                              
                              {response && response.isCorrect !== null && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 mt-2 ${response.isCorrect ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-red-50 border border-red-100 text-red-900'}`}>
                                  {response.isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                                  <div>
                                    <div className="font-semibold">{response.isCorrect ? 'Correct' : 'Incorrect'}</div>
                                    {(response.passedTestCases !== null || response.totalTestCases !== null || response.codeLanguage) && (
                                      <p className="text-sm mt-1 opacity-80">
                                        {response.codeLanguage ? `Language: ${response.codeLanguage}. ` : ''}
                                        {response.passedTestCases !== null && response.totalTestCases !== null ? `Passed ${response.passedTestCases}/${response.totalTestCases} test cases. ` : ''}
                                        {response.evaluationStatus === 'manual_review' ? 'Queued for manual review.' : ''}
                                      </p>
                                    )}
                                    {response.evaluationReason && (
                                      <p className="text-sm mt-1 opacity-80">{response.evaluationReason}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              {response && response.isCorrect === null && (
                                <div className="p-4 rounded-lg flex items-start gap-3 mt-2 bg-amber-50 border border-amber-200 text-amber-900">
                                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                  <div>
                                    <div className="font-semibold">
                                      {response.evaluationStatus === 'manual_review' ? 'Manual Review' : 'Evaluation Pending'}
                                    </div>
                                    {(response.passedTestCases !== null || response.totalTestCases !== null || response.codeLanguage) && (
                                      <p className="text-sm mt-1 opacity-80">
                                        {response.codeLanguage ? `Language: ${response.codeLanguage}. ` : ''}
                                        {response.passedTestCases !== null && response.totalTestCases !== null ? `Passed ${response.passedTestCases}/${response.totalTestCases} test cases. ` : ''}
                                      </p>
                                    )}
                                    {response.evaluationReason && (
                                      <p className="text-sm mt-1 opacity-80">{response.evaluationReason}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Score & Proctoring */}
            <div className="space-y-6">
              <ScoreOverrideCard
                attempt={attempt}
                paperId={id}
                cutoffScore={attempt.questionPaper.cutoffScore}
              />

              <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold mb-4 text-lg">Proctoring Report</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">Proctoring Score</span>
                    <span className={`font-bold ${attempt.proctoringScore < 70 ? 'text-red-500' : 'text-primary'}`}>
                      {attempt.proctoringScore} / 100
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">Total Violations</span>
                    <span className="font-bold">{attempt.totalViolations}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase">Violation Log</h4>
                  {mainViolations.length === 0 ? (
                    <div className="text-sm text-primary flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> No violations detected.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mainViolations.map(v => (
                        <div key={v.id} className={`text-sm border-l-2 pl-3 py-2 bg-muted/20 rounded-r-lg space-y-2 ${v.violationType === 'IDENTITY_CHECK' ? 'border-primary' : 'border-yellow-500'}`}>
                          <div className="flex items-center gap-2 font-medium">
                            <AlertTriangle className={`w-3.5 h-3.5 ${v.violationType === 'IDENTITY_CHECK' ? 'text-primary' : 'text-yellow-500'}`} />
                            {v.violationType}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {new Date(v.timestamp).toLocaleDateString()} {new Date(v.timestamp).toLocaleTimeString()} - {v.description}
                          </div>
                          {v.mediaUrl && (
                            <div className="mt-2 border rounded-lg overflow-hidden bg-black/5 max-w-full">
                              <img 
                                src={v.mediaUrl} 
                                alt={v.violationType} 
                                className="w-full h-auto max-h-48 object-contain" 
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Environmental Mobile Feed Snapshots */}
              {mobileFeeds.length > 0 && (
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold mb-2 text-lg">360° Environmental Feed</h3>
                  <p className="text-xs text-muted-foreground mb-4">Linked Mobile Camera Feed history</p>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                    {mobileFeeds.map(feed => (
                      <div key={feed.id} className="bg-muted/30 border rounded-lg overflow-hidden flex flex-col">
                        <img 
                          src={feed.mediaUrl || ''} 
                          alt="Side View environmental Feed" 
                          className="w-full h-24 object-cover" 
                        />
                        <div className="p-1.5 text-[9px] text-muted-foreground text-center border-t bg-white">
                          {new Date(feed.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    ))}
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
