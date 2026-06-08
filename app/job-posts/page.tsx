"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { jobsActions } from "@/store/slices/jobsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapPin, Briefcase, Users, PlusCircle, Inbox, Loader2, Link as LinkIcon, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '');
};

const STATUS_STYLES: Record<string, { pill: string; dot: string; label: string }> = {
  open:   { pill: "bg-primary/5 text-primary border-primary/20", dot: "bg-primary", label: "Open" },
  paused: { pill: "bg-amber-50  text-amber-700  border-amber-200",  dot: "bg-amber-500",  label: "Paused" },
  filled: { pill: "bg-primary/5   text-primary   border-primary/20",   dot: "bg-primary",   label: "Filled" },
  closed: { pill: "bg-red-50    text-red-700    border-red-200",    dot: "bg-red-500",    label: "Closed" },
  draft:  { pill: "bg-slate-50  text-slate-600  border-slate-200",  dot: "bg-slate-400",  label: "Draft"  },
};

export default function JobPostsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const dispatch = useDispatch();

  function load() {
    if (!orgId) return;
    setLoading(true);
    dispatch(jobsActions.fetchJobPostsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setJobs(data ?? []);
        setLoading(false);
      },
      reject: () => setLoading(false)
    }));
  }

  useEffect(() => { load(); }, [orgId, dispatch]);

  function updateStatus(jobId: string, newStatus: string) {
    const prev = jobs.find(j => j.id === jobId)?.status;
    setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    setUpdatingId(jobId);
    
    dispatch(jobsActions.updateJobPostRequest({
      id: jobId,
      payload: { status: newStatus },
      resolve: () => {
        toast.success(`Status updated to "${STATUS_STYLES[newStatus]?.label ?? newStatus}"`);
        setUpdatingId(null);
      },
      reject: () => {
        setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? { ...j, status: prev } : j));
        toast.error("Could not update status. Please try again.");
        setUpdatingId(null);
      }
    }));
  }

  function copyPublicLink(jobId: string) {
    const url = `${window.location.origin}/careers/${jobId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(jobId);
    toast.success("Public job link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function confirmDelete() {
    if (!jobToDelete) return;
    setIsDeleting(true);
    dispatch(jobsActions.deleteJobPostRequest({
      id: jobToDelete,
      resolve: () => {
        toast.success("Job post deleted successfully");
        setJobToDelete(null);
        setIsDeleting(false);
        load();
      },
      reject: (err) => {
        toast.error(err || "Failed to delete job post");
        setIsDeleting(false);
      }
    }));
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter !== "all" && job.createdAt) {
      const jobDate = new Date(job.createdAt);
      const now = new Date();
      if (dateFilter === "today") {
        matchesDate = jobDate.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = jobDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        matchesDate = jobDate >= monthAgo;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader title="Job Posts" description="Manage all your organization's job openings and applicants">
          <Button asChild className="gap-2">
            <Link href="/job-posts/create">
              <PlusCircle className="h-4 w-4" />
              Create Job
            </Link>
          </Button>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4 mb-2">
          <Input 
            placeholder="Search by job title..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="max-w-sm"
          />
          <div className="flex gap-2 items-center">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm !== "" || dateFilter !== "all") && (
              <Button 
                variant="ghost" 
                className="h-9 px-2 text-muted-foreground hover:text-foreground shrink-0" 
                onClick={() => {
                  setSearchTerm("");
                  setDateFilter("all");
                }}
                title="Clear Filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.closed;
            const isUpdating = updatingId === job.id;

            return (
              <Card key={job.id} className="hover:shadow-md transition-all group border-t-4 border-t-transparent hover:border-t-primary flex flex-col h-full">
                <CardHeader className="pb-3 flex-none">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {job.title}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Employment type badge */}
                      <Badge variant="secondary" className="font-normal text-xs px-2 py-0.5 capitalize">
                        {job.employmentType || "Full-time"}
                      </Badge>

                      {/* Inline status selector */}
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        <Select
                          value={job.status ?? "open"}
                          onValueChange={(val) => updateStatus(job.id, val)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger
                            className={`h-6 text-[11px] font-semibold border rounded-full px-2.5 py-0 gap-1.5 w-auto focus:ring-0 shadow-none ${style.pill}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="start" className="min-w-[130px]">
                            <SelectItem value="open"   className="text-primary font-medium text-xs">🟢 Open</SelectItem>
                            <SelectItem value="paused" className="text-amber-700  font-medium text-xs">🟡 Paused</SelectItem>
                            <SelectItem value="filled" className="text-primary   font-medium text-xs">🔵 Filled</SelectItem>
                            <SelectItem value="closed" className="text-red-700    font-medium text-xs">🔴 Closed</SelectItem>
                            <SelectItem value="draft"  className="text-slate-600  font-medium text-xs">⚪ Draft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px] flex-1">
                    {stripHtml(job.description) || "No description provided."}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground font-medium flex-none">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span className="truncate">{job.location || "Remote"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span className="truncate">{job.experience || "Entry Level"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t mt-auto flex-none">
                    <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-primary/70" />
                      <span>{job._count?.applications || 0} Applicants</span>
                    </div>
                    <div className="flex gap-2">
                      {job.status === 'open' && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10" onClick={() => copyPublicLink(job.id)} title="Copy Public Link">
                          {copiedId === job.id ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                        </Button>
                      )}
                      {job.status !== 'open' && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 text-muted-foreground" onClick={() => setJobToDelete(job.id)} title="Delete Job Post">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild className="h-8">
                        <Link href={`/job-posts/${job.id}/edit`}>Edit</Link>
                      </Button>
                      <Button size="sm" asChild className="h-8">
                        <Link href={`/job-posts/${job.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!loading && filteredJobs.length === 0 && jobs.length > 0 && (
          <div className="text-center p-12 text-muted-foreground">
            No job posts match your filters.
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/10 text-center space-y-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Inbox className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium">No job posts yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">You haven't created any job posts. Get started by creating your first job opening.</p>
            </div>
            <Button asChild className="mt-4 gap-2">
              <Link href="/job-posts/create">
                <PlusCircle className="h-4 w-4" />
                Create Job
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job post? This action cannot be undone and will remove all associated applications.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setJobToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

