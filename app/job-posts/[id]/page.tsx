"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { jobsActions } from "@/store/slices/jobsSlice";
import { organizationActions } from "@/store/slices/organizationSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, BackButton } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, LayoutGrid, List, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { KanbanBoard } from "@/components/common/KanbanBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStoredUser } from "@/lib/auth";
import { toast } from "sonner";

export default function JobPostDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [stages, setStages] = useState<any[]>([]);
  const [filterSource, setFilterSource] = useState("");
  const [filterMinScore, setFilterMinScore] = useState<number | "">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSkills, setFilterSkills] = useState("");


  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const canInvite = currentUser?.roleSlug === 'hr' || currentUser?.roleSlug === 'recruiter';

  const applyLink = typeof window !== 'undefined' ? `${window.location.origin}/careers/${id}/apply` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applyLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  function load() {
    dispatch(jobsActions.fetchJobPostByIdRequest({
      id,
      resolve: (data) => {
        setJob(data.jobPost ?? null);
      }
    }));

    dispatch(jobsActions.fetchJobApplicationsRequest({
      jobId: id,
      resolve: (apps) => setApplications(apps ?? []),
      reject: () => setApplications([])
    }));

    if (currentUser?.organizationId) {
      dispatch(organizationActions.fetchStagesRequest({
        organizationId: currentUser.organizationId,
        resolve: (data: any) => {
          if (data.stages) setStages(data.stages);
        }
      }));
    }
  }

  useEffect(() => { if (id && currentUser) load(); }, [id, dispatch, currentUser]);

  function handleStatusChange(appId: string, newStatus: string) {
    setApplications(apps => apps.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    dispatch(jobsActions.updateJobApplicationStatusRequest({
      jobId: id,
      appId,
      payload: { status: newStatus },
      resolve: () => load(),
      reject: () => load()
    }));
  }

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setIsInviting(true);
    dispatch(jobsActions.inviteCandidateRequest({
      jobId: id,
      payload: {
        candidateName: inviteName,
        email: inviteEmail,
        requesterUserId: currentUser.id
      },
      resolve: () => {
        toast.success('Invitation sent successfully!');
        setIsInviteModalOpen(false);
        setInviteName('');
        setInviteEmail('');
        setIsInviting(false);
      },
      reject: (err) => {
        toast.error(err || 'Failed to send invitation.');
        setIsInviting(false);
      }
    }));
  }

  // Filter Logic
  const filteredApplications = applications.filter((app: any) => {
    if (filterMinScore !== "") {
      if ((app.aiScore || 0) < Number(filterMinScore)) return false;
    }
    if (filterDateFrom) {
      if (new Date(app.createdAt) < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo) {
      // Add one day to include the end date fully
      const toDate = new Date(filterDateTo);
      toDate.setDate(toDate.getDate() + 1);
      if (new Date(app.createdAt) >= toDate) return false;
    }
    if (filterSkills) {
      const keywords = filterSkills.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      const parsedSkillsStr = Array.isArray(app.parsedSkills) ? app.parsedSkills.join(' ') : JSON.stringify(app.parsedSkills || '');
      const textToSearch = `${app.resumeText || ''} ${app.aiFeedback || ''} ${parsedSkillsStr}`.toLowerCase();
      if (keywords.length > 0 && !keywords.some(k => textToSearch.includes(k))) {
        return false;
      }
    }
    // Note: Source filter not fully implemented on schema yet, ignoring for now or mock it
    return true;
  });

  const paginatedApplications = filteredApplications.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApps(paginatedApplications.map(a => a.id));
    } else {
      setSelectedApps([]);
    }
  };

  const toggleAppSelection = (appId: string, checked: boolean) => {
    if (checked) {
      setSelectedApps(prev => [...prev, appId]);
    } else {
      setSelectedApps(prev => prev.filter(id => id !== appId));
    }
  };

  const handleBulkAction = async (status: string) => {
    if (selectedApps.length === 0) return;
    setIsBulkLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        dispatch(jobsActions.bulkUpdateApplicationsRequest({
          jobId: id,
          payload: { applicationIds: selectedApps, status },
          resolve,
          reject
        }));
      });
      toast.success(`Successfully updated ${selectedApps.length} candidates`);
      setSelectedApps([]);
      load();
    } catch (err: any) {
      toast.error(err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const skillsArray = job?.skills
    ? (Array.isArray(job.skills) ? job.skills : (typeof job.skills === 'string' ? job.skills.split(',') : []))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton href="/job-posts" />
          <PageHeader title={job?.title || "Job Post Details"} description="View job information and manage applicants" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">
            {job && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Job Details</CardTitle>
                    <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="capitalize">{job.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <div 
                      className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0" 
                      dangerouslySetInnerHTML={{ __html: job.description || "No description provided." }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Department</p>
                      <p className="font-medium text-sm">{job.department?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Location</p>
                      <p className="font-medium text-sm">{job.location || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Experience</p>
                      <p className="font-medium text-sm">{job.experience || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Employment</p>
                      <p className="font-medium text-sm">{job.employmentType || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Duration</p>
                      <p className="font-medium text-sm">{job.duration || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Salary Range</p>
                      <p className="font-medium text-sm">{job.salaryMin ? `$${job.salaryMin}` : '-'} {job.salaryMax ? `- $${job.salaryMax}` : ''}</p>
                    </div>
                  </div>

                  {skillsArray.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {skillsArray.map((skill: string, i: number) => (
                          <Badge key={i} variant="secondary">{skill.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Applicants ({applications.length})</CardTitle>
                  <CardDescription>Candidates who have applied for this position.</CardDescription>
                </div>
                <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                  <TabsList>
                    <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> List</TabsTrigger>
                    <TabsTrigger value="kanban" className="gap-2"><LayoutGrid className="h-4 w-4" /> Kanban</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-end gap-3 p-4 border-b text-sm">
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

                {viewMode === 'kanban' ? (
                  <KanbanBoard 
                    applications={filteredApplications} 
                    stages={stages} 
                    onStatusChange={handleStatusChange} 
                    onItemClick={(id) => router.push(`/candidates/${id}`)}
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredApplications.length > 0 && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 px-2">
                          <Checkbox
                            checked={paginatedApplications.length > 0 && selectedApps.length === paginatedApplications.length}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm font-medium">Select All</span>
                        </div>
                        {selectedApps.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" disabled={isBulkLoading}>
                                Bulk Actions ({selectedApps.length})
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleBulkAction('shortlisted')}>Mark as Shortlist</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBulkAction('written_test')}>Mark as Hold / Written Test</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBulkAction('rejected')} className="text-red-600">Reject Selected</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )}
                    {paginatedApplications.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-lg border p-4 transition-colors hover:bg-muted/30 cursor-pointer flex gap-4"
                        onClick={() => router.push(`/candidates/${a.id}`)}
                      >
                        <div className="pt-2" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedApps.includes(a.id)}
                            onCheckedChange={(c) => toggleAppSelection(a.id, !!c)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Top row: Avatar + info + buttons */}
                          <div className="flex gap-4">
                            <Avatar className="h-10 w-10 border shrink-0">
                              <AvatarFallback className="bg-primary/5 text-primary">
                                {a.fullName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              {/* Name + status */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-base">{a.fullName}</h4>
                                <Badge variant={a.status === 'applied' ? 'secondary' : 'default'} className="text-[10px] uppercase h-5">{a.status}</Badge>
                                {a.aiScore !== null && (
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                    AI Score: {a.aiScore.toFixed(0)}/100
                                  </Badge>
                                )}
                                {a.isPotentialDuplicate && (
                                  <Badge variant="destructive" className="bg-amber-500">Duplicate</Badge>
                                )}
                              </div>

                              {/* Email + phone */}
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
                                <span className="truncate max-w-[200px]">{a.email}</span>
                                <span className="text-muted-foreground/50">•</span>
                                <span>{a.phone || 'No phone'}</span>
                              </p>

                              {/* Exp + company + location */}
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 flex-wrap">
                                {a.yearsExperience ? `${a.yearsExperience}y exp` : 'No exp'}
                                <span className="text-muted-foreground/50">•</span>
                                {a.currentCompany || 'No company'}
                                <span className="text-muted-foreground/50">•</span>
                                {a.location || 'No location'}
                              </p>

                              {/* Buttons — always below info, always wrap */}
                              <div className="flex flex-wrap gap-2 mt-3" onClick={e => e.stopPropagation()}>
                                {a.resumePath && (
                                  <Button size="sm" variant="default" asChild>
                                    <a href={a.resumePath} target="_blank" rel="noreferrer">Resume</a>
                                  </Button>
                                )}
                                {a.linkedinUrl && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={a.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>
                                  </Button>
                                )}
                                {a.portfolioUrl && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={a.portfolioUrl} target="_blank" rel="noreferrer">Portfolio</a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {(a.expectedCtc || a.noticePeriod || a.coverLetter) && (
                            <>
                              <Separator className="my-4" />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {a.expectedCtc && (
                                  <div>
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Expected CTC</span>
                                    <span className="font-medium">{a.expectedCtc}</span>
                                  </div>
                                )}
                                {a.noticePeriod && (
                                  <div>
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Notice Period</span>
                                    <span className="font-medium">{a.noticePeriod}</span>
                                  </div>
                                )}
                                {a.coverLetter && (
                                  <div className="col-span-1 sm:col-span-2 mt-2">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-2">Cover Letter</span>
                                    <p className="whitespace-pre-wrap p-3 bg-muted/50 rounded-md text-sm italic">{a.coverLetter}</p>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredApplications.length === 0 && (
                      <div className="text-center p-8 border rounded-lg border-dashed">
                        <p className="text-muted-foreground">No applications found.</p>
                      </div>
                    )}

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredApplications.length)} of {filteredApplications.length}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {canInvite && (
                  <Button className="w-full" variant="default" onClick={() => setIsInviteModalOpen(true)}>
                    Invite Candidate
                  </Button>
                )}
                <Button className="w-full" asChild variant="outline">
                  <a href={applyLink} target="_blank" rel="noreferrer">
                    View Public Job Page
                  </a>
                </Button>
                <Button className="w-full" asChild variant="secondary">
                  <Link href={`/job-posts/${id}/edit`}>Edit Job Post</Link>
                </Button>

              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Share Apply Link</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                  <div className="flex-1 truncate text-xs text-muted-foreground pl-1">
                    {applyLink}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Candidate</DialogTitle>
            <DialogDescription>
              Send an email invitation to a candidate to apply for this job.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="candidateName">Candidate Name</Label>
              <Input
                id="candidateName"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidateEmail">Candidate Email</Label>
              <Input
                id="candidateEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)} disabled={isInviting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
