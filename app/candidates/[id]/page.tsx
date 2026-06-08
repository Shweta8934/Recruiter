import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/server/prisma';
import { getSessionUser, assertTenantMembership } from '@/lib/server/tenantGuard';
import { PageHeader, BackButton } from '@/components/common';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, AlertTriangle, UserPlus, HelpCircle, Video, Briefcase, Eye, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { CandidateLeftActions, CandidateRightActions } from '@/components/candidates/CandidateActionClient';
import { Button } from '@/components/ui/button';
import { InterviewSection } from '@/components/interviews/InterviewSection';
import { RecruiterNotesClient } from '@/components/candidates/RecruiterNotesClient';
import { CandidateTabsClient } from '@/components/candidates/CandidateTabsClient';
import { TimelineClient } from '@/components/candidates/TimelineClient';

export default async function CandidateDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sessionUser = await getSessionUser();
  let currentUserEmail = '';
  if (sessionUser?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { email: true }
    });
    currentUserEmail = dbUser?.email || '';
  }

  const application = await prisma.jobApplication.findUnique({
    where: { id: params.id },
    include: {
      job: true,
      testAttempts: {
        include: {
          questionPaper: true
        }
      }
    }
  });

  if (!application) {
    notFound();
  }

  if (!sessionUser) {
    notFound();
  }

  const isAllowed = sessionUser.roleSlug === 'super-admin' || await assertTenantMembership(sessionUser.id, application.organizationId);
  if (!isAllowed) {
    notFound();
  }

  // Interviewers can access only candidates explicitly assigned to them.
  if (sessionUser?.roleSlug === 'interviewer') {
    const assignmentLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'job_application',
        entityId: application.id,
        action: 'interview_assigned',
      },
      select: { id: true, actorUserId: true, metadataJson: true },
      orderBy: { createdAt: 'desc' },
    });
    const hasAssignment = assignmentLogs.some((log: any) => {
      const meta = (log.metadataJson || {}) as any
      return meta.assignedInterviewerUserId === sessionUser.id || log.actorUserId === sessionUser.id
    })
    if (!hasAssignment) notFound();
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityType: 'job_application',
          entityId: application.id,
        },
        {
          entityType: 'candidate_test_attempt',
          entityId: { in: application.testAttempts.map((attempt) => attempt.id) },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: { name: true, email: true },
      },
    },
    take: 30,
  });

  const stageHistory = await prisma.jobApplicationStageHistory.findMany({
    where: { applicationId: application.id, organizationId: application.organizationId },
    orderBy: { changedAt: 'asc' },
  });

  const serializableLogs = auditLogs.map(log => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    createdAt: log.createdAt.toISOString(),
    metadataJson: log.metadataJson,
    beforeJson: log.beforeJson,
    afterJson: log.afterJson,
    actor: log.actor ? {
      name: log.actor.name,
      email: log.actor.email
    } : null
  }));

  const customAnswers = application.customAnswers as any[] || [];
  const parsedSkills = application.parsedSkills as string[] || [];
  const parsedEducation = application.parsedEducation as any[] || [];
  const parsedWorkHistory = application.parsedWorkHistory as any[] || [];
  const parsedProjects = application.parsedProjects as any[] || [];
  const parsedSocialLinks = application.parsedSocialLinks as any[] || [];
  const parsedCertificates = application.parsedCertificates as string[] || [];
  const parsedAchievements = application.parsedAchievements as string[] || [];
  const parsedSummary = application.parsedSummary as string || "";
  const aiExplainability = application.aiExplainability as { reasons: string[], gaps: string[] } | null;

  const statusTransitions = stageHistory.length;
  const feedbackEvents = auditLogs.filter((l) => l.action === 'ai_feedback_submitted').length;
  const overrideEvents = auditLogs.filter((l) => l.action === 'ai_score_override').length;
  const scoringEvents = auditLogs.filter((l) => l.action === 'ai_screening_scored').length;
  const proctoringEvents = auditLogs.filter((l) => l.entityType === 'candidate_test_attempt').length;

  const orgUsers = await prisma.user.findMany({
    where: { organizationId: application.organizationId, status: 'active' },
    select: { id: true, name: true, email: true }
  });

  const rounds = await prisma.roundMaster.findMany({
    where: { organizationId: application.organizationId },
    select: { id: true, name: true, evaluationTemplateId: true }
  });

  // Query similar candidates applying for the same job with the highest AI scores
  const similarCandidates = await prisma.jobApplication.findMany({
    where: {
      jobId: application.jobId,
      id: { not: application.id },
      organizationId: application.organizationId,
      aiScore: { not: null }
    },
    orderBy: {
      aiScore: 'desc'
    },
    select: {
      id: true,
      fullName: true,
      aiScore: true,
      status: true
    },
    take: 3
  });

  // Extract recruiter notes from audit logs
  const recruiterNotes = auditLogs
    .filter((log) => log.action === 'recruiter_note_added')
    .map((log) => {
      const meta = (log.metadataJson as any) || {};
      return {
        id: log.id,
        note: meta.note as string,
        createdAt: log.createdAt,
        actorName: log.actor?.name || log.actor?.email || 'System'
      };
    });

  const stages = [
    { key: "applied", label: "Applied" },
    { key: "written_test", label: "Written Test" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "interviewed", label: "Interviewing" },
    { key: "offered", label: "Offered" },
  ];

  const normalizedStatus =
    application.status === "shortlist" ? "shortlisted" :
      application.status === "hold" ? "written_test" :
        ["interviewed", "interview_scheduled", "interview_completed", "interview_cancelled", "reschedule_requested"].includes(application.status) ? "interviewed" :
          application.status;

  const isRejected = application.status === 'rejected';
  let rejectionStage: string | null = null;
  if (isRejected) {
    const lastNonRejectedStage = [...stageHistory]
      .reverse()
      .find(entry => entry.toStatus !== 'rejected' && entry.toStatus !== null);
    rejectionStage = lastNonRejectedStage?.toStatus || 'applied';
  }

  const normalizedRejectionStage =
    rejectionStage === "shortlist" ? "shortlisted" :
      rejectionStage === "hold" ? "written_test" :
        ["interviewed", "interview_scheduled", "interview_completed", "interview_cancelled", "reschedule_requested"].includes(rejectionStage || '') ? "interviewed" :
          rejectionStage;

  const currentStageIndex = stages.findIndex(s => s.key === normalizedStatus);
  const rejectionStageIndex = isRejected ? stages.findIndex(s => s.key === normalizedRejectionStage) : -1;

  const getStageIcon = (key: string, isDone: boolean, isRejectedStage: boolean) => {
    if (isRejectedStage) return <XCircle className="w-3.5 h-3.5" />;
    if (isDone) return <CheckCircle2 className="w-3.5 h-3.5" />;
    switch (key) {
      case "applied": return <UserPlus className="w-3.5 h-3.5" />;
      case "written_test": return <HelpCircle className="w-3.5 h-3.5" />;
      case "shortlisted": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "interviewed": return <Video className="w-3.5 h-3.5" />;
      case "offered": return <Briefcase className="w-3.5 h-3.5" />;
      default: return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'offered') {
      return <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30">Offered</Badge>;
    }
    if (normalized === 'rejected') {
      return <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">Rejected</Badge>;
    }
    if (normalized === 'applied') {
      return <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200">Applied</Badge>;
    }
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30 capitalize">{status.replace('_', ' ')}</Badge>;
  };

  const candidateInitials = application.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Dynamic AI score breakdown
  const aiScoreVal = application.aiScore ?? 0;
  const scoreBreakdown = {
    technicalSkills: Math.min(100, Math.max(0, Math.round(aiScoreVal * 1.05))),
    experienceRelevance: Math.min(100, Math.max(0, Math.round(aiScoreVal * 0.98))),
    cultureFit: Math.min(100, Math.max(0, Math.round(aiScoreVal * 0.88))),
    requirementsMatch: Math.min(100, Math.max(0, Math.round(aiScoreVal * 0.95))),
  };
  const renderAssessmentsTab = () => {
    if (!application.testAttempts || application.testAttempts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
          <HelpCircle className="w-8 h-8 text-zinc-400 mb-2" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No Assessments Assigned</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            No assessment attempts have been registered or completed for this candidate yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {application.testAttempts.map((attempt) => {
          const isPassed = attempt.score !== null && attempt.score >= attempt.questionPaper.cutoffScore;
          
          return (
            <div key={attempt.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {attempt.questionPaper.title}
                    </h4>
                    {attempt.isCompleted ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Started: {attempt.startTime ? format(new Date(attempt.startTime), 'dd MMM yyyy, hh:mm a') : 'Not started yet'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground font-medium">Score</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {attempt.score !== null ? `${Math.round(attempt.score)}%` : '—'}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-850" />
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground font-medium">Result</div>
                    <div className="text-xs font-semibold mt-0.5">
                      {attempt.score !== null ? (
                        isPassed ? (
                          <span className="text-emerald-600 dark:text-emerald-400">PASSED (Cutoff: {attempt.questionPaper.cutoffScore}%)</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">FAILED (Cutoff: {attempt.questionPaper.cutoffScore}%)</span>
                        )
                      ) : (
                        <span className="text-zinc-500">Pending Evaluation</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Proctoring summary row */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className={`w-3.5 h-3.5 ${attempt.totalViolations > 0 ? 'text-amber-500' : 'text-zinc-400'}`} />
                    <span>Violations: <strong className="text-zinc-800 dark:text-zinc-200">{attempt.totalViolations}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Proctoring Score: <strong className="text-zinc-800 dark:text-zinc-200">{attempt.proctoringScore}/100</strong></span>
                  </div>
                  {attempt.isFlaggedForReview && (
                    <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 text-[10px] py-0 px-2 h-5">
                      Flagged for review
                    </Badge>
                  )}
                </div>

                {attempt.isCompleted && (
                  <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 gap-1 px-2.5 -mr-2" asChild>
                    <a href={`/question-papers/${attempt.questionPaperId}/attempts/${attempt.id}`} target="_blank" rel="noreferrer">
                      View Report <Eye className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderScreeningAnswers = () => {
    if (customAnswers.length === 0) {
      return <p className="text-xs text-muted-foreground italic">No screening answers provided.</p>;
    }
    return (
      <div className="space-y-4">
        {customAnswers.map((ca, idx) => (
          <div key={idx} className="space-y-1.5">
            <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{idx + 1}. {ca.question}</p>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border-l-2 border-blue-500">
              {ca.answer}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResume = () => {
    return (
      <div className="space-y-6">
        {parsedSummary && (
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Summary</h4>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{parsedSummary}</p>
          </div>
        )}

        {parsedSkills.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {parsedSkills.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {parsedWorkHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Work History</h4>
            <div className="space-y-3 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100 dark:before:bg-zinc-800 pl-4">
              {parsedWorkHistory.map((w, i) => (
                <div key={i} className="relative space-y-1">
                  <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                    {w.role} <span className="text-zinc-400 font-normal">at {w.company}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{w.duration}</p>
                  {w.description && <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{w.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsedEducation.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Education</h4>
            <div className="space-y-3 pl-4 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100 dark:before:bg-zinc-800">
              {parsedEducation.map((e, i) => (
                <div key={i} className="relative space-y-0.5">
                  <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{e.degree}</p>
                  <p className="text-xs text-zinc-500">{e.institution} • {e.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsedProjects.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Projects</h4>
            <div className="space-y-3">
              {parsedProjects.map((p, i) => (
                <div key={i} className="space-y-1 border border-zinc-100 dark:border-zinc-800 rounded-lg p-3">
                  <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 flex justify-between items-center">
                    <span>{p.name}</span>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline">
                        Link
                      </a>
                    )}
                  </p>
                  {p.description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsedCertificates.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Certifications</h4>
            <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-1 pl-1">
              {parsedCertificates.map((cert, i) => (
                <li key={i}>{cert}</li>
              ))}
            </ul>
          </div>
        )}

        {parsedAchievements.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Achievements</h4>
            <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-1 pl-1">
              {parsedAchievements.map((ach, i) => (
                <li key={i}>{ach}</li>
              ))}
            </ul>
          </div>
        )}

        {parsedSocialLinks.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Social Links</h4>
            <div className="flex flex-wrap gap-2">
              {parsedSocialLinks.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900">
                  {s.platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Top Navigation & Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
          <div className="space-y-1">
            <BackButton 
              href={`/job-posts/${application.jobId}`} 
              label={`Job: ${application.job.title}`} 
              className="-ml-3 h-auto hover:bg-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-medium mb-1.5" 
            />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
              {application.fullName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Applying for {application.job.title} · Applied {format(new Date(application.createdAt), 'dd MMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            {getStatusBadge(application.status)}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-900/30 text-center space-y-1 shadow-sm">
            <span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{statusTransitions}</span>
            <span className="text-[10px] text-zinc-500 font-medium block leading-tight">Stage changes</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-900/30 text-center space-y-1 shadow-sm">
            <span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{scoringEvents}</span>
            <span className="text-[10px] text-zinc-500 font-medium block leading-tight">AI screening runs</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-900/30 text-center space-y-1 shadow-sm">
            <span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{overrideEvents}</span>
            <span className="text-[10px] text-zinc-500 font-medium block leading-tight">AI overrides</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-900/30 text-center space-y-1 shadow-sm">
            <span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{feedbackEvents}</span>
            <span className="text-[10px] text-zinc-500 font-medium block leading-tight">Feedback events</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-900/30 text-center space-y-1 shadow-sm">
            <span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{proctoringEvents}</span>
            <span className="text-[10px] text-zinc-500 font-medium block leading-tight">Proctoring flags</span>
          </div>
        </div>

        {/* 3-Column Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6 items-start w-full overflow-hidden">

          {/* Left Column (Sidebar - 280px) */}
          <div className="space-y-6 min-w-0 w-full">

            {/* Overview Card */}
            <Card>
              <CardContent className="space-y-4 pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                    {candidateInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{application.fullName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{application.job.title}</p>
                    {application.isPotentialDuplicate && (
                      <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-[10px] px-1.5 py-0 mt-1 h-4">
                        Duplicate
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 my-2" />

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-900/50">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-zinc-900 dark:text-zinc-200 truncate max-w-[170px]" title={application.email}>
                      {application.email}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-900/50">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="text-zinc-900 dark:text-zinc-200">{application.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-900/50">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-zinc-900 dark:text-zinc-200">{application.location || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-900/50">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="text-zinc-900 dark:text-zinc-200">{application.yearsExperience ?? '-'} years</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-900/50">
                    <span className="text-muted-foreground">Current Co.</span>
                    <span className="text-zinc-900 dark:text-zinc-200 truncate max-w-[140px]" title={application.currentCompany || ''}>
                      {application.currentCompany || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Expected CTC</span>
                    <span className="text-zinc-900 dark:text-zinc-200 truncate max-w-[140px]" title={application.expectedCtc || ''}>
                      {application.expectedCtc || '-'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 my-2" />

                <div className="flex flex-wrap gap-2 pt-1">
                  {application.linkedinUrl && (
                    <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1" asChild>
                      <a href={application.linkedinUrl} target="_blank" rel="noreferrer">
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {application.githubUrl && (
                    <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1" asChild>
                      <a href={application.githubUrl} target="_blank" rel="noreferrer">
                        GitHub
                      </a>
                    </Button>
                  )}
                  {application.resumePath && (
                    <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1" asChild>
                      <a href={application.resumePath} target="_blank" rel="noreferrer">
                        <Eye className="w-3.5 h-3.5" /> View Resume
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Match Score Card */}
            <Card>
              <CardContent className="space-y-4 pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r="28" fill="none" className="stroke-zinc-100 dark:stroke-zinc-800" strokeWidth="6" />
                      <circle
                        cx="36"
                        cy="36"
                        r="28"
                        fill="none"
                        className="stroke-blue-500 dark:stroke-blue-400"
                        strokeWidth="6"
                        strokeDasharray="175.9"
                        strokeDashoffset={application.aiScore !== null ? 175.9 - (175.9 * application.aiScore) / 100 : 175.9}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-base text-blue-600 dark:text-blue-400">
                      {application.aiScore !== null ? Math.round(application.aiScore) : '-'}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">AI Match Score</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Model {application.aiModelVersion || 'v2.4'} · Prompt {application.aiPromptVersion || 'v1.7'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/85">Advisory only</p>
                  </div>
                </div>

                {aiExplainability && (
                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {aiExplainability.reasons && aiExplainability.reasons.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Top Match Reasons</div>
                        <div className="flex flex-wrap gap-1">
                          {aiExplainability.reasons.map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30">
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiExplainability.gaps && aiExplainability.gaps.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Potential Gaps</div>
                        <div className="flex flex-wrap gap-1">
                          {aiExplainability.gaps.map((g, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <CandidateLeftActions
              jobId={application.jobId}
              applicationId={application.id}
              currentStatus={application.status}
              aiFeedback={application.aiFeedback}
              aiScore={application.aiScore}
            />

          </div>

          {/* Center Column (Main Content - Flexible) */}
          <div className="space-y-6 min-w-0 w-full">

            {/* Stage Journey tracker */}
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Stage Journey</div>
                <div className="w-full">
                  {/* Desktop Horizontal View (hidden on mobile, flex on md+) */}
                  <div className="hidden md:block relative w-full py-4">
                    {/* Progress Line Background */}
                    <div className="absolute left-[10%] right-[10%] top-8 h-[2px] bg-zinc-100 dark:bg-zinc-800/80 -translate-y-1/2 z-0" />
                    
                    {/* Active Progress Line */}
                    <div 
                      className="absolute left-[10%] top-8 h-[2px] bg-blue-600 dark:bg-blue-500 -translate-y-1/2 z-0 transition-all duration-300"
                      style={{ 
                        width: `${
                          isRejected 
                            ? (rejectionStageIndex / (stages.length - 1)) * 80
                            : normalizedStatus === 'offered'
                              ? 80
                              : (currentStageIndex / (stages.length - 1)) * 80
                        }%` 
                      }}
                    />

                    {/* Stage Circles */}
                    <div className="relative flex justify-between w-full z-10">
                      {stages.map((stage, idx) => {
                        const isDone = isRejected 
                          ? idx < rejectionStageIndex 
                          : (currentStageIndex > idx || normalizedStatus === 'offered');
                        const isCurrent = !isRejected && normalizedStatus === stage.key;
                        const isRejectedStage = isRejected && idx === rejectionStageIndex;

                        return (
                          <div key={stage.key} className="flex flex-col items-center gap-1.5 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
                              isDone 
                                ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' 
                                : isRejectedStage
                                  ? 'bg-red-50 border-red-600 text-red-600 dark:bg-red-950/30 dark:border-red-400 dark:text-red-400'
                                  : isCurrent 
                                    ? 'bg-blue-50 border-blue-600 text-blue-600 dark:bg-blue-950/30 dark:border-blue-400 dark:text-blue-400' 
                                    : 'bg-white border-zinc-200 text-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-600'
                            }`}>
                              {getStageIcon(stage.key, isDone, isRejectedStage)}
                            </div>
                            <span className={`text-[10px] font-medium text-center ${
                              isRejectedStage 
                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                : isCurrent 
                                  ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                                  : 'text-zinc-500'
                            }`}>
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile Vertical View (flex on mobile, hidden on md+) */}
                  <div className="md:hidden flex flex-col space-y-4 pl-2 relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[16px] top-4 bottom-4 w-[2px] bg-zinc-100 dark:bg-zinc-800/80 z-0" />
                    
                    {/* Active vertical connector line */}
                    <div 
                      className="absolute left-[16px] top-4 w-[2px] bg-blue-600 dark:bg-blue-500 z-0 transition-all duration-300"
                      style={{ 
                        height: `${
                          isRejected 
                            ? (rejectionStageIndex / (stages.length - 1)) * 88
                            : normalizedStatus === 'offered'
                              ? 88
                              : (currentStageIndex / (stages.length - 1)) * 88
                        }%`
                      }}
                    />

                    {stages.map((stage, idx) => {
                      const isDone = isRejected 
                        ? idx < rejectionStageIndex 
                        : (currentStageIndex > idx || normalizedStatus === 'offered');
                      const isCurrent = !isRejected && normalizedStatus === stage.key;
                      const isRejectedStage = isRejected && idx === rejectionStageIndex;

                      return (
                        <div key={stage.key} className="flex items-center gap-3.5 relative z-10 py-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-200 shrink-0 ${
                            isDone 
                              ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' 
                              : isRejectedStage
                                ? 'bg-red-50 border-red-600 text-red-600 dark:bg-red-950/30 dark:border-red-400 dark:text-red-400'
                                : isCurrent 
                                  ? 'bg-blue-50 border-blue-600 text-blue-600 dark:bg-blue-950/30 dark:border-blue-400 dark:text-blue-400' 
                                  : 'bg-white border-zinc-200 text-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-600'
                          }`}>
                            {getStageIcon(stage.key, isDone, isRejectedStage)}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-xs font-semibold ${
                              isRejectedStage 
                                ? 'text-red-600 dark:text-red-400'
                                : isCurrent 
                                  ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                                  : 'text-zinc-700 dark:text-zinc-300 font-medium'
                            }`}>
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-blue-500 font-medium">Current Stage</span>
                            )}
                            {isRejectedStage && (
                              <span className="text-[10px] text-red-500 font-medium">Rejected here</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Middle Tabs switcher */}
            <CandidateTabsClient
              activityTab={<TimelineClient logs={serializableLogs} />}
              screeningTab={renderScreeningAnswers()}
              resumeTab={renderResume()}
              interviewsTab={
                <InterviewSection
                  applicationId={application.id}
                  organizationId={application.organizationId}
                  jobId={application.jobId}
                  users={orgUsers}
                  rounds={rounds}
                  currentUserEmail={currentUserEmail}
                  currentUserRole={sessionUser?.roleSlug || ''}
                />
              }
              assessmentsTab={renderAssessmentsTab()}
            />

          </div>

          {/* Right Column (Sidebar - 260px) */}
          <div className="space-y-6 min-w-0 w-full">

            {/* Hire Decision Card */}
            <CandidateRightActions
              jobId={application.jobId}
              applicationId={application.id}
              currentStatus={application.status}
            />

            {/* Score Breakdown Card */}
            <Card>
              <CardContent className="space-y-3 pt-6 pb-6">
                <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Score Breakdown</div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Technical Skills</span>
                      <span className="font-semibold">{scoreBreakdown.technicalSkills}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full" style={{ width: `${scoreBreakdown.technicalSkills}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Experience Relevance</span>
                      <span className="font-semibold">{scoreBreakdown.experienceRelevance}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full" style={{ width: `${scoreBreakdown.experienceRelevance}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Culture Fit Signals</span>
                      <span className="font-semibold">{scoreBreakdown.cultureFit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 dark:bg-purple-400 rounded-full" style={{ width: `${scoreBreakdown.cultureFit}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Requirements Match</span>
                      <span className="font-semibold">{scoreBreakdown.requirementsMatch}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 dark:bg-purple-400 rounded-full" style={{ width: `${scoreBreakdown.requirementsMatch}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recruiter Notes Card */}
            <RecruiterNotesClient
              jobId={application.jobId}
              applicationId={application.id}
              notes={recruiterNotes}
            />

            {/* Similar Candidates Card */}
            <Card>
              <CardContent className="space-y-3 pt-6 pb-6">
                <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Similar Candidates</div>
                {similarCandidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No other candidates for this job.</p>
                ) : (
                  <div className="space-y-3">
                    {similarCandidates.map((cand) => {
                      const initials = cand.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <a
                          key={cand.id}
                          href={`/candidates/${cand.id}`}
                          className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800/50"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{cand.fullName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Score {cand.aiScore ? Math.round(cand.aiScore) : '-'} · <span className="capitalize">{cand.status.replace('_', ' ')}</span>
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
