"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { jobsActions } from "@/store/slices/jobsSlice";
import { fetchProjectByIdRequest } from "@/store/slices/projectsSlice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ApplyJobPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!id) return;
    dispatch(fetchProjectByIdRequest({
      projectId: id,
      resolve: (data) => setProject(data ?? null)
    }));
  }, [id, dispatch]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    dispatch(jobsActions.applyToJobRequest({
      jobId: id,
      payload: form,
      resolve: () => {
        setLoading(false);
        setSubmitted(true);
      },
      reject: () => {
        setLoading(false);
        toast.error("Application failed. Please check required fields.");
      }
    }));
  }

  if (submitted) {
    return <div className="max-w-2xl mx-auto p-6"><Card><CardContent className="pt-6">Application submitted successfully.</CardContent></Card></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Apply for {project?.name || "Job"}</CardTitle>
          <CardDescription>Fill your details and upload resume</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div><Label>Full Name *</Label><Input name="fullName" required /></div>
            <div><Label>Email *</Label><Input type="email" name="email" required /></div>
            <div><Label>Phone</Label><Input name="phone" /></div>
            <div><Label>Location</Label><Input name="location" /></div>
            <div><Label>Years of Experience</Label><Input type="number" name="yearsExperience" /></div>
            <div><Label>Current Company</Label><Input name="currentCompany" /></div>
            <div><Label>Expected CTC</Label><Input name="expectedCtc" /></div>
            <div><Label>Notice Period</Label><Input name="noticePeriod" /></div>
            <div><Label>LinkedIn URL</Label><Input name="linkedinUrl" /></div>
            <div><Label>Portfolio URL</Label><Input name="portfolioUrl" /></div>
            <div><Label>Cover Letter</Label><Textarea name="coverLetter" rows={4} /></div>
            <div><Label>Resume</Label><Input type="file" name="resume" accept=".pdf,.doc,.docx" /></div>
            <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Application"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
