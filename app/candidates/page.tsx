"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { jobsActions } from "@/store/slices/jobsSlice";
import { organizationActions } from "@/store/slices/organizationSlice";
import { RootState } from "@/store/rootReducer";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState, Pagination } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, LayoutGrid, List, Briefcase, ChevronRight, Loader2, Search, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KanbanBoard } from "@/components/common/KanbanBoard";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CandidatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const dispatch = useDispatch();
  const isInterviewer = user?.roleSlug === 'interviewer';
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");

  const [rows, setRows] = useState<any[]>([]);
  const [assignedAppIds, setAssignedAppIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  const [stages, setStages] = useState<any[]>([]);
  const [filterMinScore, setFilterMinScore] = useState<number | "">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSkills, setFilterSkills] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime1, setInterviewTime1] = useState("");
  const [interviewTime2, setInterviewTime2] = useState("");
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState("");

  // Status Email Confirmation
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ appId: string, status: string } | null>(null);

  // Job status update
  const [updatingJobStatus, setUpdatingJobStatus] = useState(false);

  const updateJobStatus = (jobId: string, newStatus: string) => {
    setUpdatingJobStatus(true);
    // Optimistic update
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    dispatch(jobsActions.updateJobPostRequest({
      id: jobId,
      payload: { status: newStatus },
      resolve: () => {
        toast.success(`Job status updated to "${newStatus}"`);
        setUpdatingJobStatus(false);
      },
      reject: () => {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: j.status } : j));
        toast.error("Failed to update job status. Please try again.");
        setUpdatingJobStatus(false);
      }
    }));
  }

  useEffect(() => {
    if (!orgId) return;
    dispatch(jobsActions.fetchJobPostsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setJobs(data ?? []);
      },
      reject: () => {
        setJobs([]);
      }
    }));

    // Fetch custom stages
    dispatch(organizationActions.fetchStagesRequest({
      organizationId: orgId,
      resolve: (data: any) => {
        if (data.stages) setStages(data.stages);
      }
    }));
  }, [orgId, dispatch]);

  useEffect(() => {
    if (!orgId) return;
    dispatch(organizationActions.loadUsersRequest({
        organizationId: orgId,
        requesterUserId: user?.id ?? "",
        resolve: (data: any) => {
          const users = data?.users || [];
          setInterviewers(users.filter((u: any) => u?.role?.slug === 'interviewer' || u?.roleSlug === 'interviewer'));
        }
      }));
  }, [orgId, user?.id, dispatch]);

  useEffect(() => {
    if (!orgId || jobs.length === 0) return;

    let jobsToFetch = jobs;
    if (selectedJobId !== "all") {
      jobsToFetch = jobs.filter(j => j.id === selectedJobId);
    }

    const fetchApplications = async () => {
      const appLists = await Promise.all(
        jobsToFetch.map((j: any) =>
          new Promise<any>((resolve) => {
            dispatch(jobsActions.fetchJobApplicationsRequest({
              jobId: j.id,
              resolve: (apps) => resolve((apps ?? []).map((a: any) => ({ ...a, jobTitle: j.title, jobId: j.id }))),
              reject: () => resolve([])
            }));
          })
        )
      );
      setRows(appLists.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setPage(1); // Reset page on job switch
    };

    fetchApplications();
  }, [orgId, jobs, selectedJobId, dispatch]);

  useEffect(() => {
    if (user?.roleSlug !== 'interviewer') return;
    dispatch(jobsActions.fetchAssignedCandidatesRequest({
      resolve: (data) => {
        if (data.applicationIds) setAssignedAppIds(data.applicationIds);
      }
    }));
  }, [user?.roleSlug, dispatch]);

  const filtered = useMemo(() => {
    const scopedRows = user?.roleSlug === 'interviewer'
      ? rows.filter((r) => assignedAppIds.includes(r.id))
      : rows;
    return scopedRows.filter((r) => {
      // 1. Text Search Query
      if (query && !`${r.fullName} ${r.email} ${r.jobTitle}`.toLowerCase().includes(query.toLowerCase())) return false;
      
      // 2. Score
      if (filterMinScore !== "") {
        if ((r.aiScore || 0) < Number(filterMinScore)) return false;
      }
      
      // 3. Date
      if (filterDateFrom) {
        if (new Date(r.createdAt) < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setDate(toDate.getDate() + 1);
        if (new Date(r.createdAt) >= toDate) return false;
      }
      
      // 4. Skills
      if (filterSkills) {
        const keywords = filterSkills.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        const parsedSkillsStr = Array.isArray(r.parsedSkills) ? r.parsedSkills.join(' ') : JSON.stringify(r.parsedSkills || '');
        const textToSearch = `${r.resumeText || ''} ${r.aiFeedback || ''} ${parsedSkillsStr}`.toLowerCase();
        if (keywords.length > 0 && !keywords.some(k => textToSearch.includes(k))) {
          return false;
        }
      }
      
      return true;
    });
  }, [rows, query, user?.roleSlug, assignedAppIds, filterMinScore, filterDateFrom, filterDateTo, filterSkills]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / limit);
  const paginatedRows = filtered.slice((page - 1) * limit, page * limit);

  // 1. Start Status Change
  function requestStatusChange(appId: string, status: string) {
    setPendingStatusChange({ appId, status });
    setEmailConfirmOpen(true);
  }

  // 2. Commit Status Change (with or without email)
  const commitStatusChange = (sendEmail: boolean) => {
    if (!pendingStatusChange) return;
    const { appId, status } = pendingStatusChange;
    setEmailConfirmOpen(false);
    setPendingStatusChange(null);

    const app = rows.find(r => r.id === appId);
    if (!app) return;

    // Optimistic UI update
    setRows(prev => prev.map(r => r.id === appId ? { ...r, status } : r));

    dispatch(jobsActions.updateJobApplicationStatusRequest({
      jobId: app.jobId,
      appId: appId,
      payload: { status },
      resolve: () => {
        toast.success(`Moved to ${status}`);
        // Send email if requested
        if (sendEmail) {
          sendCandidateMail(app, "status_update", status);
        }
      },
      reject: () => {
        toast.error("Failed to update candidate status");
        // Revert Optimistic update
        setRows(prev => prev.map(r => r.id === appId ? { ...r, status: app.status } : r));
      }
    }));
  }

  // Send generic mails
  const sendCandidateMail = (candidate: any, type: string, newStatus?: string) => {
    setSendingId(`${candidate.id}:${type}`);
    dispatch(jobsActions.sendCandidateEmailRequest({
      payload: {
        to: candidate.email,
        candidateName: candidate.fullName,
        jobTitle: candidate.jobTitle,
        type,
        newStatus,
        actorName: user?.name,
        organizationName: user?.organizationId || "Organization",
      },
      resolve: () => {
        setSendingId(null);
        toast.success(`Email sent to ${candidate.fullName}`);
      },
      reject: () => {
        setSendingId(null);
        toast.error("Failed to send candidate email");
      }
    }));
  }

  // Interview Invite Workflow
  function openInterviewModal(candidate: any) {
    setSelectedCandidate(candidate);
    setInterviewDate("");
    setInterviewTime1("");
    setInterviewTime2("");
    setSelectedInterviewerId("");
    setInterviewModalOpen(true);
  }

  const sendInterviewInvite = () => {
    if (!selectedCandidate || !interviewDate || !interviewTime1 || !interviewTime2 || !selectedInterviewerId) {
      toast.error("Please select a date and both time slots");
      return;
    }

    const now = new Date();
    const d1 = new Date(`${interviewDate}T${interviewTime1}`);
    const d2 = new Date(`${interviewDate}T${interviewTime2}`);

    if (d1 <= now || d2 <= now) {
      toast.error("Please select a future date and time.");
      return;
    }

    const fullDate1 = d1.toISOString();
    const fullDate2 = d2.toISOString();
    setSendingId(`${selectedCandidate.id}:interview`);
    setInterviewModalOpen(false);

    dispatch(jobsActions.sendCandidateEmailRequest({
      payload: {
        applicationId: selectedCandidate.id,
        to: selectedCandidate.email,
        candidateName: selectedCandidate.fullName,
        jobTitle: selectedCandidate.jobTitle,
        type: "interview",
        actorName: user?.name,
        organizationName: user?.organizationId || "Organization",
        interviewerUserId: selectedInterviewerId,
        date1: fullDate1,
        date2: fullDate2
      },
      resolve: () => {
        setSendingId(null);
        toast.success("Interview invitation sent successfully!");
      },
      reject: () => {
        setSendingId(null);
        toast.error("Failed to send interview mail");
      }
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 flex flex-col h-full">
        <PageHeader title="Candidate Management" description="Manage and track applicants" />

        {!orgId ? (
          <EmptyState icon={UserCheck} title="No organization" description="Assign organization first to manage candidates." />
        ) : jobs.length === 0 ? (
          <EmptyState icon={UserCheck} title="No jobs found" description="Create a Job Post first to start managing candidates." />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-[600px]">
            {/* LEFT SIDEBAR: JOBS */}
            <Card className="w-full lg:w-64 flex-shrink-0 flex flex-col overflow-hidden">
              <div className="p-4 border-b font-semibold bg-muted/20">Active Job Posts</div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <Button
                  variant={selectedJobId === "all" ? "default" : "ghost"}
                  className="w-full justify-start text-left font-normal"
                  onClick={() => setSelectedJobId("all")}
                >
                  <Briefcase className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">All Jobs</span>
                </Button>
                {jobs.map(job => (
                  <Button
                    key={job.id}
                    variant={selectedJobId === job.id ? "default" : "ghost"}
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <ChevronRight className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <span className="truncate">{job.title}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* RIGHT AREA: KANBAN / LIST */}
            <Card className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="p-4 border-b flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email..."
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" asChild>
                      <a href={`/api/candidates/export?organizationId=${orgId}&jobId=${selectedJobId}`} download>
                        Export CSV
                      </a>
                    </Button>
                    <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                      <TabsList>
                        <TabsTrigger value="kanban" className="gap-2"><LayoutGrid className="h-4 w-4" /> Kanban</TabsTrigger>
                        <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> List</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Advanced Filters */}
                <div className="flex flex-wrap items-end gap-3 text-sm pt-2">
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Min AI Score</Label>
                    <Input type="number" min="0" max="100" placeholder="e.g. 70" value={filterMinScore} onChange={(e) => setFilterMinScore(e.target.value ? Number(e.target.value) : "")} className="h-9" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Applied After</Label>
                    <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-9 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Applied Before</Label>
                    <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-9 text-muted-foreground" />
                  </div>
                  <div className="flex-[2] min-w-[200px] lg:min-w-[280px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Skill Keywords (comma separated)</Label>
                    <div className="flex gap-2">
                      <Input type="text" placeholder="e.g. react, node" value={filterSkills} onChange={(e) => setFilterSkills(e.target.value)} className="h-9" />
                      {(filterMinScore !== "" || filterDateFrom || filterDateTo || filterSkills) && (
                        <Button 
                          variant="ghost" 
                          className="h-9 px-2 text-muted-foreground hover:text-foreground shrink-0" 
                          onClick={() => {
                            setFilterMinScore("");
                            setFilterDateFrom("");
                            setFilterDateTo("");
                            setFilterSkills("");
                          }}
                          title="Clear Filters"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Job details banner */}
              {selectedJobId !== "all" && (() => {
                const selectedJob = jobs.find(j => j.id === selectedJobId);
                if (!selectedJob) return null;

                const statusColors: Record<string, string> = {
                  open: "bg-primary/10 text-primary border-primary/20",
                  closed: "bg-red-100 text-red-800 border-red-200",
                  paused: "bg-amber-100 text-amber-800 border-amber-200",
                  filled: "bg-primary/10 text-primary border-primary/20",
                  draft: "bg-slate-100 text-slate-600 border-slate-200",
                };

                return (
                  <div className="px-6 py-3 bg-muted/20 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                        <Briefcase className="h-4 w-4 text-primary shrink-0" />
                        {selectedJob.title}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        {selectedJob.location && <span>📍 {selectedJob.location}</span>}
                        {selectedJob.experience && <span>💼 {selectedJob.experience}</span>}
                        {selectedJob.employmentType && <span>⏰ {selectedJob.employmentType}</span>}
                        {(selectedJob.salaryMin || selectedJob.salaryMax) && (
                          <span>
                            💵 {selectedJob.salaryMin ? `$${selectedJob.salaryMin.toLocaleString()}` : ""}
                            {selectedJob.salaryMin && selectedJob.salaryMax ? " – " : ""}
                            {selectedJob.salaryMax ? `$${selectedJob.salaryMax.toLocaleString()}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inline Status Updater */}
                    <div className="flex items-center gap-2 shrink-0">
                      {updatingJobStatus && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      <Select
                        value={selectedJob.status}
                        onValueChange={(val) => updateJobStatus(selectedJob.id, val)}
                        disabled={updatingJobStatus}
                      >
                        <SelectTrigger
                          className={`h-7 text-[11px] font-semibold capitalize border px-2.5 py-0 rounded-full w-auto gap-1.5 focus:ring-0 shadow-none ${statusColors[selectedJob.status] ?? "bg-muted text-muted-foreground border-border"
                            }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="open" className="text-primary font-medium">🟢 Open</SelectItem>
                          <SelectItem value="paused" className="text-amber-700 font-medium">🟡 Paused</SelectItem>
                          <SelectItem value="filled" className="text-primary font-medium">🔵 Filled</SelectItem>
                          <SelectItem value="closed" className="text-red-700 font-medium">🔴 Closed</SelectItem>
                          <SelectItem value="draft" className="text-slate-600 font-medium">⚪ Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })()}

              <div className="flex-1 overflow-hidden flex flex-col relative bg-muted/10">
                {viewMode === 'kanban' ? (
                  <div className="absolute inset-0 overflow-auto p-4">
                    <KanbanBoard
                      applications={filtered}
                      stages={stages}
                      onStatusChange={requestStatusChange}
                      onItemClick={(id) => router.push(`/candidates/${id}`)}
                      onScheduleClick={isInterviewer ? undefined : openInterviewModal}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto p-4">
                    <div className="rounded-md border bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Job</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Experience</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRows.map((a) => (
                            <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/candidates/${a.id}`)}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{a.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{a.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>{a.jobTitle}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{a.status.replace('_', ' ')}</Badge>
                              </TableCell>
                              <TableCell>{a.yearsExperience ?? "-"}y</TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => router.push(`/candidates/${a.id}`)}>View</Button>
                                  {!isInterviewer && (
                                    <Button size="sm" variant="default" onClick={() => openInterviewModal(a)}>Schedule</Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {paginatedRows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No candidates found in this view.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination for List View */}
              {viewMode === 'list' && totalPages > 1 && (
                <div className="border-t bg-card">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* STATUS EMAIL CONFIRMATION MODAL */}
      <Dialog open={emailConfirmOpen} onOpenChange={setEmailConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Candidate Status</DialogTitle>
            <DialogDescription>
              You are moving this candidate to a new stage. Do you want to send them an automated email notifying them of this update?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEmailConfirmOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => commitStatusChange(false)}>Skip Email</Button>
            <Button onClick={() => commitStatusChange(true)}>Send to Candidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE INTERVIEW MODAL */}
      <Dialog open={!isInterviewer && interviewModalOpen} onOpenChange={setInterviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Propose two available dates/times. The candidate will receive an email to select one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Interview Date</Label>
              <Input 
                type="date" 
                min={new Date().toLocaleDateString('en-CA')}
                value={interviewDate} 
                onChange={(e) => setInterviewDate(e.target.value)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Slot 1</Label>
                <Input type="time" value={interviewTime1} onChange={(e) => setInterviewTime1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time Slot 2</Label>
                <Input type="time" value={interviewTime2} onChange={(e) => setInterviewTime2(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Interviewer</Label>
              <Select value={selectedInterviewerId} onValueChange={setSelectedInterviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {interviewers.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name} ({i.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewModalOpen(false)}>Cancel</Button>
            <Button onClick={sendInterviewInvite} disabled={!interviewDate || !interviewTime1 || !interviewTime2 || !selectedInterviewerId || !!sendingId}>
              {sendingId ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
