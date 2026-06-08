"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, RefreshCw, Sliders } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDispatch } from "react-redux";
import { jobsActions } from "@/store/slices/jobsSlice";

const STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "written_test", label: "Written Test" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interviewed", label: "Interviewing" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
];

export function CandidateLeftActions({ 
  jobId,
  applicationId, 
  currentStatus, 
  aiFeedback,
  aiScore
}: { 
  jobId: string,
  applicationId: string, 
  currentStatus: string,
  aiFeedback: string | null,
  aiScore: number | null
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(aiFeedback);
  const [overrideScore, setOverrideScore] = useState(aiScore !== null ? String(Math.round(aiScore)) : "");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const normalizedStatus =
    currentStatus === "shortlist" ? "shortlisted" :
    currentStatus === "hold" ? "written_test" :
    ["interviewed", "interview_scheduled", "interview_completed", "interview_cancelled", "reschedule_requested"].includes(currentStatus) ? "interviewed" :
    currentStatus;

  const updateStatus = async (status: string, reason?: string) => {
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        dispatch(jobsActions.updateJobApplicationStatusRequest({
          jobId,
          appId: applicationId,
          payload: { status, statusReason: reason || null },
          resolve,
          reject
        }));
      });
      toast.success(`Status updated to ${status}`);
      router.refresh();
      setRejectModalOpen(false);
    } catch (err: any) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (val: string) => {
    if (val === "rejected") {
      setRejectModalOpen(true);
    } else {
      updateStatus(val);
    }
  };

  const submitAiFeedback = async (vote: 'thumbs_up' | 'thumbs_down') => {
    try {
      await new Promise<void>((resolve, reject) => {
        dispatch(jobsActions.updateJobApplicationStatusRequest({
          jobId,
          appId: applicationId,
          payload: { aiFeedback: vote, aiFeedbackNote: feedbackNote || null },
          resolve,
          reject
        }));
      });
      setFeedback(vote);
      toast.success("Feedback saved");
    } catch (err: any) {
      toast.error(err);
    }
  };

  const runAiScreening = async () => {
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        dispatch(jobsActions.scoreApplicationRequest({
          jobId,
          appId: applicationId,
          resolve,
          reject
        }));
      });
      toast.success("AI screening completed");
      router.refresh();
    } catch (err: any) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitOverride = async () => {
    const score = Number(overrideScore);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      toast.error("Override score must be between 0 and 100");
      return;
    }
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        dispatch(jobsActions.updateJobApplicationStatusRequest({
          jobId,
          appId: applicationId,
          payload: { aiOverrideScore: score },
          resolve,
          reject
        }));
      });
      toast.success("AI score overridden (advisory only)");
      router.refresh();
    } catch (err: any) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-4 pt-6 pb-6">
          <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Quick Actions</div>
          
          {/* Update stage */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Update pipeline stage</label>
            <Select value={normalizedStatus} onValueChange={handleStatusChange} disabled={loading}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Score Feedback */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">AI score feedback</label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                className={`h-9 flex items-center justify-center gap-1.5 text-xs transition-colors ${
                  feedback === 'thumbs_up' 
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30' 
                    : 'hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/10'
                }`}
                onClick={() => submitAiFeedback('thumbs_up')}
              >
                <ThumbsUp className="w-3.5 h-3.5" /> Accurate
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                className={`h-9 flex items-center justify-center gap-1.5 text-xs transition-colors ${
                  feedback === 'thumbs_down' 
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' 
                    : 'hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-green-950/10'
                }`}
                onClick={() => submitAiFeedback('thumbs_down')}
              >
                <ThumbsDown className="w-3.5 h-3.5" /> Inaccurate
              </Button>
            </div>
            <Textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Add a note for audit trail…"
              className="min-h-[50px] text-xs resize-none"
            />
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 my-2" />

          {/* AI Controls */}
          <div className="space-y-2">
            <Button 
              size="sm" 
              variant="outline"
              className="w-full text-xs h-9 flex items-center justify-center gap-1.5 bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-950/20"
              onClick={runAiScreening}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Run AI screening
            </Button>
            
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500 font-medium">Manual AI Score Override</label>
              <div className="flex gap-2">
                <Input 
                  className="h-9 text-xs w-20 text-center" 
                  value={overrideScore} 
                  onChange={(e) => setOverrideScore(e.target.value)} 
                  placeholder="0-100"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-9 text-xs flex-1"
                  onClick={submitOverride}
                  disabled={loading}
                >
                  <Sliders className="w-3.5 h-3.5 mr-1" /> Override
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Candidate</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              placeholder="Reason (e.g., Lacks required experience)" 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => updateStatus('rejected', rejectReason)}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CandidateRightActions({
  jobId,
  applicationId,
  currentStatus
}: {
  jobId: string,
  applicationId: string,
  currentStatus: string
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const updateStatus = async (status: string, reason?: string) => {
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        dispatch(jobsActions.updateJobApplicationStatusRequest({
          jobId,
          appId: applicationId,
          payload: { status, statusReason: reason || null },
          resolve,
          reject
        }));
      });
      toast.success(`Status updated to ${status}`);
      router.refresh();
      setRejectModalOpen(false);
    } catch (err: any) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-3 pt-6 pb-6">
          <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Hire Decision</div>
          
          <Button 
            className="w-full text-xs h-9 flex items-center justify-center gap-1.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-950/30"
            variant="outline"
            onClick={() => updateStatus('offered')}
            disabled={loading || currentStatus === 'offered'}
          >
            Extend offer
          </Button>

          <Button 
            className="w-full text-xs h-9 flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/30"
            variant="outline"
            onClick={() => setRejectModalOpen(true)}
            disabled={loading || currentStatus === 'rejected'}
          >
            Reject candidate
          </Button>
        </CardContent>
      </Card>

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Candidate</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              placeholder="Reason (e.g., Lacks required experience)" 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => updateStatus('rejected', rejectReason)}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Keep a default fallback for backwards compatibility
export default function CandidateActionClient(props: any) {
  return <CandidateLeftActions {...props} />;
}
