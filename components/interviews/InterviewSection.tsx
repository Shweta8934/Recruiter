"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, Clock, CheckCircle2, User, FileText, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { FeedbackModal } from './FeedbackModal';
import { RescheduleInterviewModal } from './RescheduleInterviewModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { jobsActions } from '@/store/slices/jobsSlice';
import { useRouter } from 'next/navigation';

interface InterviewSectionProps {
  applicationId: string;
  organizationId: string;
  jobId: string;
  users: any[]; // Org users for scheduling
  rounds: any[]; // RoundMaster items
  currentUserEmail: string;
  currentUserRole: string;
}

export function InterviewSection({ applicationId, organizationId, jobId, users, rounds, currentUserEmail, currentUserRole }: InterviewSectionProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [editingFeedback, setEditingFeedback] = useState<any>(null);
  const [limit, setLimit] = useState(2);

  const handleEditFeedback = (interview: any, feedback: any) => {
    setSelectedInterview(interview);
    setEditingFeedback(feedback);
    setFeedbackModalOpen(true);
  };

  const handleDeleteFeedback = async (interviewId: string) => {
    if (!confirm("Are you sure you want to delete your feedback? This action cannot be undone.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/feedback`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete feedback");
      
      toast.success("Feedback deleted successfully");
      fetchInterviews();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete feedback");
      setLoading(false);
    }
  };

  const handleCancelInterview = (id: string) => {
    if (!confirm("Are you sure you want to cancel this interview? Attendees will be notified.")) return;

    setLoading(true);
    dispatch(jobsActions.updateInterviewRequest({
      id,
      payload: { status: 'cancelled' },
      resolve: () => {
        toast.success("Interview cancelled successfully");
        fetchInterviews();
        router.refresh();
      },
      reject: (err: string) => {
        toast.error(err || "Failed to cancel interview");
        setLoading(false);
      }
    }));
  };

  const handleCompleteInterview = (id: string) => {
    setLoading(true);
    dispatch(jobsActions.updateInterviewRequest({
      id,
      payload: { status: 'completed' },
      resolve: () => {
        toast.success("Interview marked as completed");
        fetchInterviews();
        router.refresh();
      },
      reject: (err: string) => {
        toast.error(err || "Failed to mark interview as completed");
        setLoading(false);
      }
    }));
  };

  const fetchInterviews = () => {
    setLoading(true);
    dispatch(jobsActions.fetchInterviewsByApplicationRequest({
      applicationId,
      resolve: (data: any[]) => {
        setInterviews(data);
        setLoading(false);
      },
      reject: () => setLoading(false)
    }));
  };

  useEffect(() => {
    fetchInterviews();
  }, [applicationId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Interviews</CardTitle>
        <Button onClick={() => setScheduleModalOpen(true)} size="sm" variant="default">
          <Calendar className="w-4 h-4 mr-2" /> Schedule Interview
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading interviews...</p>
        ) : interviews.length === 0 ? (
          <div className="text-center py-6 border rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No interviews scheduled</p>
            <p className="text-xs text-muted-foreground">Schedule an interview to evaluate this candidate.</p>
          </div>
        ) : (
          interviews.slice(0, limit).map((interview) => (
            <div key={interview.id} className="border rounded-lg p-4 space-y-3 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{interview.round?.name || 'Interview'}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(interview.scheduledAt), 'PPp')} ({interview.duration} mins)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={interview.status === 'completed' ? 'secondary' : interview.status === 'cancelled' ? 'destructive' : 'outline'} className="capitalize">
                    {interview.status}
                  </Badge>
                  {interview.status === 'scheduled' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCompleteInterview(interview.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Mark as Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedInterview(interview); setRescheduleModalOpen(true); }}>
                          Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleCancelInterview(interview.id)}>
                          Cancel Interview
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm mt-2">
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <User className="w-4 h-4" />
                  {interview.participants.map((p: any) => p.user.name || p.user.email).join(', ')}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={
                    interview.status === 'scheduled' ? 'secondary' :
                    interview.status === 'completed' ? 'default' : 'destructive'
                  }>
                    {interview.status}
                  </Badge>
                  {!['cancelled', 'completed'].includes(interview.status) && interview.meetLink && (
                    <a href={interview.meetLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                      <Video className="w-4 h-4" /> Join Meeting
                    </a>
                  )}
                </div>
              </div>

              {/* Feedback Section */}
              <div className="mt-4 pt-3 border-t">
                {interview.feedbacks.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold uppercase text-muted-foreground">Feedback</h5>

                      {/* Highlight Disagreement */}
                      {(() => {
                        const recs = interview.feedbacks.map((f: any) => f.recommendation);
                        const hasPositive = recs.some((r: string) => r === 'Hire' || r === 'Strong Hire');
                        const hasNegative = recs.some((r: string) => r === 'No Hire' || r === 'Strong No Hire');
                        const isDisagreement = hasPositive && hasNegative;

                        if (isDisagreement && interview.feedbacks.length > 1) {
                          return (
                            <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 gap-1 flex items-center">
                              <AlertCircle className="w-3 h-3" /> Calibration Required
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {interview.feedbacks.map((fb: any) => {
                      // Anti-anchoring: if current user hasn't submitted feedback, hide others
                      const currentUserIsParticipant = interview.participants.some((p: any) => p.user.email === currentUserEmail);
                      const currentUserSubmitted = interview.feedbacks.some((f: any) => 
                        (f.interviewer?.email || '').toLowerCase() === currentUserEmail.toLowerCase()
                      );

                      const isMyFeedback = (fb.interviewer?.email || '').toLowerCase() === (currentUserEmail || '').toLowerCase();

                      if (currentUserIsParticipant && !currentUserSubmitted && !isMyFeedback) {
                        return (
                          <div key={fb.id} className="text-xs italic text-muted-foreground bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
                            Feedback hidden until you submit yours (Anti-anchoring policy)
                          </div>
                        );
                      }

                      const interviewerName = fb.interviewer?.name || 'Interviewer';
                      const interviewerRole = fb.interviewer?.role?.name || '';
                      const displayName = interviewerRole ? `${interviewerName} (${interviewerRole})` : interviewerName;

                      return (
                        <div key={fb.id} className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-md text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{displayName}</span>
                              <Badge variant="outline">{fb.recommendation}</Badge>
                            </div>
                            {isMyFeedback && (
                              <div className="flex items-center gap-1.5">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleEditFeedback(interview, fb)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteFeedback(interview.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                          {fb.comments && <p className="text-zinc-600 dark:text-zinc-400 mt-1">{fb.comments}</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No feedback submitted yet.</p>
                )}

                {/* Submit Feedback Button (only if participant or high privilege, and hasn't submitted) */}
                {(() => {
                  const safeEmail = (currentUserEmail || '').toLowerCase();
                  const isHighPrivilege = ['super-admin', 'org-admin', 'hr', 'recruiter'].includes(currentUserRole);
                  const participant = interview.participants.find((p: any) => (p.user?.email || '').toLowerCase() === safeEmail);
                  const currentUser = users.find((u: any) => (u.email || '').toLowerCase() === safeEmail);

                  const hasSubmitted = interview.feedbacks.some((f: any) => 
                    (f.interviewer?.email || '').toLowerCase() === safeEmail
                  );

                  // Provide Feedback is only available if the interview is marked 'completed'
                  const canSubmit = (participant || isHighPrivilege) && !hasSubmitted && interview.status === 'completed';

                  if (canSubmit) {
                    return (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3 w-full"
                        onClick={() => { setSelectedInterview(interview); setEditingFeedback(null); setFeedbackModalOpen(true); }}
                      >
                        <FileText className="w-4 h-4 mr-2" /> Provide Feedback
                      </Button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ))
        )}

        {!loading && interviews.length > limit && (
          <div className="flex justify-center pt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 h-8 font-medium"
              onClick={() => setLimit((prev) => prev + 5)}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              See more
            </Button>
          </div>
        )}
      </CardContent>

      <ScheduleInterviewModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        applicationId={applicationId}
        organizationId={organizationId}
        jobId={jobId}
        users={users}
        rounds={rounds}
        onSuccess={() => {
          fetchInterviews();
          router.refresh();
        }}
      />

      {selectedInterview && (
        <FeedbackModal
          open={feedbackModalOpen}
          onOpenChange={(open) => {
            setFeedbackModalOpen(open);
            if (!open) {
              setEditingFeedback(null);
            }
          }}
          interviewId={selectedInterview.id}
          templateId={selectedInterview.round?.evaluationTemplateId}
          existingFeedback={editingFeedback}
          onSuccess={() => {
            fetchInterviews();
            router.refresh();
          }}
        />
      )}

      {selectedInterview && (
        <RescheduleInterviewModal
          open={rescheduleModalOpen}
          onOpenChange={setRescheduleModalOpen}
          interviewId={selectedInterview.id}
          currentScheduledAt={selectedInterview.scheduledAt}
          currentDuration={selectedInterview.duration}
          onSuccess={() => {
            fetchInterviews();
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
