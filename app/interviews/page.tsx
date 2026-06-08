"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { jobsActions } from "@/store/slices/jobsSlice";
import { usersActions } from "@/store/slices/usersSlice";
import { roundsActions } from "@/store/slices/roundsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Video, Trash2, CalendarIcon, CheckCircle, XCircle, MessageSquare } from "lucide-react";

export default function InterviewsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const dispatch = useDispatch();
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime1, setInterviewTime1] = useState("");
  const [interviewTime2, setInterviewTime2] = useState("");
  const [duration, setDuration] = useState("60");
  const [roundId, setRoundId] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [meetLink, setMeetLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [interviewsMap, setInterviewsMap] = useState<Record<string, any>>({});

  // Cancel Interview state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Reject Reschedule state
  const [isRejectingReschedule, setIsRejectingReschedule] = useState(false);

  // 1. Fetch Jobs
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

    // Fetch org users and rounds for the scheduling modal
    dispatch(usersActions.fetchUsersRequest({
      organizationId: orgId,
      resolve: (data) => {
        if (data.users) {
          const allowedRoles = ['org-admin', 'hr', 'recruiter', 'interviewer', 'developer', 'senior-recruiter'];
          setOrgUsers(data.users.filter((u: any) => 
            u.status === 'active' && u.role && allowedRoles.includes(u.role.slug)
          ));
        }
      }
    }));

    dispatch(roundsActions.fetchRoundsRequest({
      organizationId: orgId,
      resolve: (data: any) => { 
        if (data.rounds) setRounds(data.rounds); 
        else if (Array.isArray(data)) setRounds(data); 
      }
    }));

    // Fetch confirmed interviews
    dispatch(jobsActions.fetchInterviewsRequest({
      organizationId: orgId,
      resolve: (data) => {
        if (data.interviews) {
          const map: Record<string, any> = {};
          data.interviews.forEach((i: any) => {
            // Since interviews are ordered by scheduledAt desc, the first one we encounter is the most recent.
            if (!map[i.applicationId]) {
              map[i.applicationId] = i;
            }
          });
          setInterviewsMap(map);
        }
      }
    }));

  }, [orgId, dispatch]);

  // 2. Fetch Applications for all jobs
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    if (jobs.length === 0) {
      return;
    }

    const fetchApplications = async () => {
      const appLists = await Promise.all(
        jobs.map((j: any) =>
          new Promise<any>((resolve) => {
            dispatch(jobsActions.fetchJobApplicationsRequest({
              jobId: j.id,
              resolve: (apps) => resolve((apps ?? []).map((a: any) => ({ ...a, jobTitle: j.title, jobId: j.id }))),
              reject: () => resolve([])
            }));
          })
        )
      );
      setAllApplications(appLists.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setIsLoading(false);
    };

    fetchApplications();
  }, [orgId, jobs, dispatch]);

  useEffect(() => {
    // Stop loading if jobs are successfully fetched but length is 0
    if (jobs.length === 0 && !orgId) {
       setIsLoading(false);
    }
  }, [jobs, orgId]);
  
  // Actually, a better way to handle loading is just a simple timeout or checking jobs. 
  // For simplicity, we just set isLoading false if jobs fetch is done.
  useEffect(() => {
    if (jobs.length === 0) {
       const timer = setTimeout(() => setIsLoading(false), 2000); // fallback
       return () => clearTimeout(timer);
    }
  }, [jobs]);

  // Fetch previous Zoom link if opening the reschedule modal
  useEffect(() => {
    if (interviewModalOpen && selectedCandidateId) {
      const interview = interviewsMap[selectedCandidateId];
      if (interview?.meetLink) {
        setMeetLink(interview.meetLink);
      }
    }
  }, [interviewModalOpen, selectedCandidateId, interviewsMap]);

  // Candidates with interviews (either scheduled or pending)
  const interviewCandidates = useMemo(() => {
    return allApplications.filter(a => a.interviewDate1 || a.interviewSelectedDate);
  }, [allApplications]);

  // Filtered by search and date
  const filteredInterviews = useMemo(() => {
    let filtered = interviewCandidates;
    
    if (filterDate) {
      filtered = filtered.filter(a => {
        const d1 = a.interviewSelectedDate || a.interviewDate1;
        if (!d1) return false;
        // Check if the ISO string starts with the selected date string (YYYY-MM-DD)
        return d1.startsWith(filterDate);
      });
    }

    if (query) {
      filtered = filtered.filter((r) =>
        `${r.fullName} ${r.email} ${r.jobTitle}`.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return filtered;
  }, [interviewCandidates, query, filterDate]);

  const generateZoomLink = async () => {
    if (!interviewDate || !interviewTime1) {
      toast.error("Please select a date and Time Slot 1 first to generate the Zoom link.");
      return;
    }
    const selectedCandidate = allApplications.find(a => a.id === selectedCandidateId);
    const topic = selectedCandidate
      ? `Interview - ${selectedCandidate.fullName} for ${selectedCandidate.jobTitle}`
      : 'Interview';
    const startTime = new Date(`${interviewDate}T${interviewTime1}`);

    setIsGeneratingLink(true);
    dispatch(jobsActions.generateZoomLinkRequest({
      payload: { topic, startTime: startTime.toISOString(), duration: Number(duration) },
      resolve: (data) => {
        setMeetLink(data.joinUrl);
        toast.success('✅ Zoom link generated!');
        setIsGeneratingLink(false);
      },
      reject: (err) => {
        toast.error(err || 'Failed to generate Zoom link');
        setIsGeneratingLink(false);
      }
    }));
  };

  const sendInterviewInvite = async () => {
    const selectedCandidate = allApplications.find(a => a.id === selectedCandidateId);
    if (!selectedCandidate || !interviewDate || !interviewTime1 || !interviewTime2 || selectedUsers.length === 0 || !meetLink) {
      toast.error("Please fill in all required fields (Candidate, Date, Time Slots, Interviewers) and generate a Zoom link.");
      return;
    }

    const d1 = new Date(`${interviewDate}T${interviewTime1}`);
    const d2 = new Date(`${interviewDate}T${interviewTime2}`);
    const now = new Date();

    if (isRescheduling && (d1 <= now || d2 <= now)) {
      toast.error("Please select a future date and time.");
      return;
    }

    setSendingId("sending");
    
    dispatch(jobsActions.sendCandidateEmailRequest({
      payload: {
        applicationId: selectedCandidate.id,
        to: selectedCandidate.email,
        candidateName: selectedCandidate.fullName,
        jobTitle: selectedCandidate.jobTitle,
        type: "interview",
        actorName: user?.name,
        organizationName: user?.organizationId || "Organization",
        interviewerIds: selectedUsers,
        roundId: roundId || undefined,
        duration: Number(duration),
        date1: d1.toISOString(),
        date2: d2.toISOString(),
        meetLink: meetLink || undefined,
        isReschedule: !!(selectedCandidate?.interviewDate1 || selectedCandidate?.interviewSelectedDate),
      },
      resolve: () => {
        setSendingId(null);
        toast.success("Interview invitation sent successfully!");
        setInterviewModalOpen(false);
        setMeetLink("");
        setInterviewDate("");
        setInterviewTime1("");
        setInterviewTime2("");
        // Optimistic UI update
        setAllApplications(prev => prev.map(app => 
          app.id === selectedCandidate.id ? { 
            ...app, 
            interviewDate1: d1.toISOString(),
            interviewDate2: d2.toISOString()
          } : app
        ));
      },
      reject: () => {
        setSendingId(null);
        toast.error("Failed to send interview mail");
      }
    }));
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCancelInterview = async () => {
    if (!selectedInterviewId) return;
    setIsCancelling(true);
    
    dispatch(jobsActions.cancelInterviewRequest({
      id: selectedInterviewId,
      payload: { status: 'cancelled', reason: cancelReason },
      resolve: () => {
        toast.success("Interview cancelled and emails sent.");
        setCancelModalOpen(false);
        setCancelReason("");
        
        // Update local state
        setInterviewsMap(prev => {
          const newMap = { ...prev };
          for (const appId in newMap) {
            if (newMap[appId].id === selectedInterviewId) {
              newMap[appId].status = 'cancelled';
            }
          }
          return newMap;
        });
        setIsCancelling(false);
      },
      reject: (err) => {
        toast.error(err);
        setIsCancelling(false);
      }
    }));
  };

  const handleRejectReschedule = async (applicationId: string) => {
    setIsRejectingReschedule(true);
    dispatch(jobsActions.rejectRescheduleRequest({
      id: applicationId,
      resolve: () => {
        toast.success("Reschedule rejected. Candidate notified.");
        
        // Update local application state
        setAllApplications(prev => prev.map(a => 
          a.id === applicationId ? { ...a, status: a.interviewSelectedDate ? 'interview_scheduled' : 'interview' } : a
        ));
        setIsRejectingReschedule(false);
      },
      reject: (err) => {
        toast.error(err);
        setIsRejectingReschedule(false);
      }
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Interviews"
            description="Manage and schedule upcoming interviews"
          />
          <Button onClick={() => {
            setIsRescheduling(false);
            setSelectedCandidateId("");
            setRoundId("");
            setDuration("30");
            setSelectedUsers([]);
            setInterviewDate("");
            setInterviewTime1("");
            setInterviewTime2("");
            setMeetLink("");
            setInterviewModalOpen(true);
          }}>
            <CalendarIcon className="mr-2 h-4 w-4" /> Schedule Interview
          </Button>
        </div>

        {!orgId ? (
          <EmptyState icon={Calendar} title="No organization" description="Assign organization first to manage interviews." />
        ) : isLoading ? (
           <Card className="p-8 text-center text-muted-foreground flex justify-center items-center min-h-[400px]">
              Loading interviews...
           </Card>
        ) : interviewCandidates.length === 0 ? (
          <EmptyState 
            icon={Calendar} 
            title="No interviews scheduled" 
            description="You don't have any upcoming interviews. Click 'Schedule Interview' to send invites." 
          />
        ) : (
          <Card className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 bg-card">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates or jobs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full sm:w-auto"
                  />
                  {filterDate && (
                    <Button variant="ghost" size="sm" onClick={() => setFilterDate("")}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-muted/10">
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job Role</TableHead>
                      <TableHead>Interview Status</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInterviews.map((a) => {
                      const interview = interviewsMap[a.id];
                      return (
                        <TableRow key={a.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div 
                              className="cursor-pointer hover:underline" 
                              onClick={() => router.push(`/candidates/${a.id}`)}
                            >
                              <p className="font-medium text-primary">{a.fullName}</p>
                              <p className="text-xs text-muted-foreground">{a.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{a.jobTitle}</TableCell>
                          <TableCell>
                             {a.status === 'reschedule_requested' ? (
                               <div className="flex items-center gap-2">
                                 <Badge className="bg-amber-100 text-amber-800 border-amber-300">Reschedule Requested</Badge>
                                 {a.auditLogs?.[0]?.metadataJson?.reason && (
                                   <Button 
                                     variant="ghost" 
                                     size="sm" 
                                     className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                     onClick={() => {
                                       setRescheduleReason(a.auditLogs[0].metadataJson.reason);
                                       setReasonModalOpen(true);
                                     }}
                                     title="View Candidate's Reason"
                                   >
                                     <MessageSquare className="h-4 w-4" />
                                   </Button>
                                 )}
                               </div>
                             ) : interview?.status === 'completed' || a.status === 'interview_completed' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">Completed</Badge>
                              ) : interview?.status === 'cancelled' || a.status === 'interview_cancelled' ? (
                               <Badge variant="destructive">Cancelled</Badge>
                             ) : a.interviewSelectedDate ? (
                               <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Scheduled</Badge>
                             ) : (
                               <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100">Pending Confirmation</Badge>
                             )}
                          </TableCell>
                          <TableCell>
                             {a.interviewSelectedDate ? (
                               <span className="text-sm font-medium">{format(new Date(a.interviewSelectedDate), 'PPp')}</span>
                             ) : a.interviewDate1 ? (
                               <div className="text-xs text-muted-foreground">
                                 Waiting for candidate to pick between:<br/>
                                 <span className="font-medium">{format(new Date(a.interviewDate1), 'PPp')}</span> <br/>
                                 {a.interviewDate2 ? <span className="font-medium">{format(new Date(a.interviewDate2), 'PPp')}</span> : ''}
                               </div>
                             ) : (
                               <span className="text-muted-foreground">-</span>
                             )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {interview?.meetLink && !['cancelled', 'completed'].includes(interview.status) && (
                                <Button size="sm" onClick={() => window.open(interview.meetLink, '_blank')} className="bg-blue-600 hover:bg-blue-700">
                                  <Video className="w-4 h-4 mr-2" /> Join Meeting
                                </Button>
                              )}
                              
                              {a.status === 'reschedule_requested' && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => {
                                    setSelectedCandidateId(a.id);
                                    setRoundId(interview?.roundId || "");
                                    setInterviewModalOpen(true); // Open reschedule modal
                                  }}>
                                    <CheckCircle className="w-4 h-4 mr-1" /> Accept
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleRejectReschedule(a.id)} disabled={isRejectingReschedule}>
                                    <XCircle className="w-4 h-4 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedCandidateId(a.id);
                                    if (interview) {
                                      setRoundId(interview.roundId || "");
                                      setDuration(interview.duration?.toString() || "30");
                                      if (interview.participants) {
                                        setSelectedUsers(interview.participants.map((p: any) => p.userId));
                                      } else {
                                        setSelectedUsers([]);
                                      }
                                    } else {
                                      setRoundId("");
                                      setDuration("30");
                                      setSelectedUsers([]);
                                    }
                                    setInterviewDate("");
                                    setInterviewTime1("");
                                    setInterviewTime2("");
                                    setMeetLink("");
                                    setIsRescheduling(true);
                                    setInterviewModalOpen(true);
                                  }}>
                                    <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
                                  </DropdownMenuItem>
                                  {interview && interview.status !== 'cancelled' && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => {
                                      setSelectedInterviewId(interview.id);
                                      setCancelModalOpen(true);
                                    }}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Cancel Interview
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredInterviews.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No interviews found for your search.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* SCHEDULE INTERVIEW MODAL */}
      <Dialog open={interviewModalOpen} onOpenChange={(open) => {
        if (!open) setInterviewModalOpen(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask Candidate to Pick Time</DialogTitle>
            <DialogDescription>
              Select a candidate and propose two available dates/times. The candidate will receive an email to select one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Select Candidate</Label>
              <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a candidate..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {allApplications.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.fullName} ({app.jobTitle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interview Round</Label>
              <Select value={roundId} onValueChange={setRoundId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a round..." />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interview Date</Label>
                <Input 
                  type="date" 
                  min={new Date().toLocaleDateString('en-CA')}
                  value={interviewDate} 
                  onChange={(e) => {
                    const newDate = e.target.value;
                    const selectedCandidate = allApplications.find(a => a.id === selectedCandidateId);
                    if (isRescheduling && selectedCandidate) {
                      const prev1 = selectedCandidate.interviewDate1?.split('T')[0];
                      const prev2 = selectedCandidate.interviewDate2?.split('T')[0];
                      const prevSelected = selectedCandidate.interviewSelectedDate?.split('T')[0];
                      
                      if (newDate && (newDate === prev1 || newDate === prev2 || newDate === prevSelected)) {
                        toast.error("This date was previously selected. Please pick a new date for rescheduling.");
                        setInterviewDate("");
                        return;
                      }
                    }
                    setInterviewDate(newDate);
                  }} 
                />
              </div>
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
              <div className="flex items-center justify-between">
                <Label>Zoom Meeting Link</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={generateZoomLink}
                  disabled={isGeneratingLink || !interviewDate || !interviewTime1}
                  className="text-xs h-7 px-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {isGeneratingLink ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <span className="mr-1">✨</span>}
                  {isGeneratingLink ? 'Generating...' : 'Generate Zoom Link'}
                </Button>
              </div>
              <Input
                placeholder="Click 'Generate Zoom Link' or paste a link manually..."
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="45">45 Minutes</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="90">1.5 Hours</SelectItem>
                  <SelectItem value="120">2 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interviewers (Select at least one)</Label>
              <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                {orgUsers.map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(u.id)} 
                      onChange={() => toggleUser(u.id)}
                      className="rounded border-gray-300"
                    />
                    {u.name || u.email} <span className="text-muted-foreground ml-1">({u.role?.name})</span>
                  </label>
                ))}
                {orgUsers.length === 0 && <span className="text-sm text-muted-foreground">No active users found.</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewModalOpen(false)}>Cancel</Button>
            <Button onClick={sendInterviewInvite} disabled={!selectedCandidateId || !interviewDate || !interviewTime1 || !interviewTime2 || selectedUsers.length === 0 || !!sendingId}>
              {sendingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {sendingId ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* CANCEL INTERVIEW MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Interview</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this interview? This will send an email notification to the candidate and all interviewers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Cancellation</Label>
              <Input 
                placeholder="E.g., Position filled, interviewer unavailable..." 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={isCancelling}>
              Keep Interview
            </Button>
            <Button variant="destructive" onClick={handleCancelInterview} disabled={isCancelling || !cancelReason.trim()}>
              {isCancelling ? 'Cancelling...' : 'Cancel Interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Reason Modal */}
      <Dialog open={reasonModalOpen} onOpenChange={setReasonModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Candidate's Reschedule Reason</DialogTitle>
            <DialogDescription>
              The candidate provided the following reason for requesting a new time slot:
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted/50 rounded-md text-sm border mt-2 min-h-[100px] whitespace-pre-wrap">
            {rescheduleReason}
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setReasonModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
