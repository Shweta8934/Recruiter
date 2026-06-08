"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { jobsActions } from "@/store/slices/jobsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { JobSkillsInput } from "@/components/JobSkillsInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { departmentsActions } from "@/store/slices/departmentsSlice";
import { questionPapersActions } from "@/store/slices/questionPapersSlice";
import { useAuth } from "@/hooks/useAuth";
import { BackButton } from "@/components/common";

export default function EditJobPost() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [duration, setDuration] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState("none");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [customQuestions, setCustomQuestions] = useState<string[]>([""]);
  const [isAiScreeningEnabled, setIsAiScreeningEnabled] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (orgId) {
      dispatch(departmentsActions.fetchDepartmentsRequest({
        organizationId: orgId,
        resolve: (data) => setDepartments(data || [])
      }));

      dispatch(questionPapersActions.fetchPapersRequest({
        organizationId: orgId,
        resolve: (data: any) => {
          const activePapers = (data.questionPapers || []).filter((p: any) => p.isActive && p.status === "published");
          setQuestionPapers(activePapers);
        }
      }));
    }
  }, [orgId, dispatch]);

  const jobPosts = useSelector((state: any) => state.jobs.jobPosts);

  useEffect(() => {
    if (!id) return;
    
    // Get job directly from Redux store
    const existingJob = jobPosts.find((j: any) => j.id === id);
    if (existingJob) {
      setTitle(existingJob.title || "");
      setDescription(existingJob.description || "");
      setLocation(existingJob.location || "");
      setExperience(existingJob.experience || "");
      setDepartmentId(existingJob.departmentId || "");
      setEmploymentType(existingJob.employmentType || "");
      setDuration(existingJob.duration || "");
      setSkills(existingJob.skills ?? []);
      setSalaryMin(existingJob.salaryMin?.toString?.() || "");
      setSalaryMax(existingJob.salaryMax?.toString?.() || "");
      setIsAiScreeningEnabled(existingJob.isAiScreeningEnabled ?? true);
      const cq = Array.isArray(existingJob.customQuestions) ? existingJob.customQuestions : [];
      setCustomQuestions(cq.length ? cq.map((q: any) => String(q)) : [""]);
    }
  }, [id, jobPosts]);

  // Set the selected paper from the fetched questionPapers list when loaded
  useEffect(() => {
    if (id && questionPapers.length > 0) {
      const linkedPaper = questionPapers.find(qp => qp.jobId === id);
      if (linkedPaper) {
        setSelectedPaperId(linkedPaper.id);
      } else {
        setSelectedPaperId("none");
      }
    }
  }, [id, questionPapers]);

  const handleGenerateAI = async () => {
    if (!title) throw new Error("Please enter a Job Title first");
    return new Promise<string>((resolve, reject) => {
      dispatch(jobsActions.generateJdRequest({
        payload: { title, skills, experience },
        resolve: (data) => resolve(data.generatedHtml),
        reject
      }));
    });
  }

  function save() {
    setError("");
    setFieldErrors({});
    
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Title is required";
    if (!departmentId) errors.departmentId = "Department is required";
    if (!description.trim()) errors.description = "Description is required";
    if (!location.trim()) errors.location = "Location is required";
    if (skills.length === 0) errors.skills = "At least one skill is required";
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    dispatch(jobsActions.updateJobPostRequest({
      id,
      payload: {
        title,
        description,
        location,
        experience,
        departmentId,
        employmentType,
        duration,
        skills,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        customQuestions: customQuestions.map((q) => q.trim()).filter(Boolean).slice(0, 5),
        isAiScreeningEnabled,
        status: jobPosts.find((j: any) => j.id === id)?.status || "open",
        questionPaperId: selectedPaperId === "none" ? null : selectedPaperId,
      },
      resolve: () => {
        router.push(`/job-posts/${id}`);
      }
    }));
  }

  function remove() {
    dispatch(jobsActions.deleteJobPostRequest({
      id,
      resolve: () => {
        router.push('/job-posts');
      }
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton href={`/job-posts/${id}`} />
          <PageHeader title="Edit Job Post" description="Update the details of your job post" />
        </div>
        <div className="max-w-4xl">
          <Card>
            <CardHeader><CardTitle>Edit Job Post</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title <span className="text-destructive">*</span></Label>
                  <Input 
                    placeholder="E.g. Senior Frontend Developer" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className={fieldErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Department <span className="text-destructive">*</span></Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className={`w-full ${fieldErrors.departmentId ? "border-destructive ring-destructive" : ""}`}>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.departmentId && <p className="text-xs text-destructive">{fieldErrors.departmentId}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description <span className="text-destructive">*</span></Label>
                <RichTextEditor 
                  value={description} 
                  onChange={setDescription} 
                  onGenerateAI={handleGenerateAI}
                  error={fieldErrors.description}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location <span className="text-destructive">*</span></Label>
                  <Input 
                    placeholder="E.g. Remote, New York" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    className={fieldErrors.location ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.location && <p className="text-xs text-destructive">{fieldErrors.location}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Input value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} placeholder="Employment Type" />
                </div>
                <div className="space-y-2">
                  <Label>Experience Level (e.g., Mid-Senior)</Label>
                  <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Experience Level" />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration" />
                </div>
              </div>

              <JobSkillsInput 
                skills={skills} 
                onChange={setSkills} 
                jobTitle={title} 
                departmentId={departmentId} 
                departments={departments} 
                error={fieldErrors.skills}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Custom Screening Questions (Max 5)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (customQuestions.length >= 5) return;
                      setCustomQuestions((prev) => [...prev, ""]);
                    }}
                    disabled={customQuestions.length >= 5}
                  >
                    Add Question
                  </Button>
                </div>
                <div className="space-y-2">
                  {customQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder={`Question ${idx + 1}`}
                        value={q}
                        onChange={(e) => {
                          const next = [...customQuestions];
                          next[idx] = e.target.value;
                          setCustomQuestions(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCustomQuestions((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={customQuestions.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary Range ($)</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Min" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                    <Input type="number" placeholder="Max" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col justify-center">
                  <Label className="mb-2">AI Resume Screening</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={isAiScreeningEnabled} onCheckedChange={setIsAiScreeningEnabled} />
                    <span className="text-sm text-muted-foreground">{isAiScreeningEnabled ? "Enabled" : "Disabled (Manual Only)"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Link Assessment / Question Paper (Optional)</Label>
                <Select value={selectedPaperId} onValueChange={setSelectedPaperId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an assessment to link to this job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Assessment</SelectItem>
                    {questionPapers.map((qp) => (
                      <SelectItem key={qp.id} value={qp.id}>
                        {qp.title} ({qp.duration} mins, {qp.totalQuestions} Qs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Candidates who apply to this job will be linked to the selected assessment.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => router.push(`/job-posts/${id}`)}>Cancel</Button>
                <Button variant="destructive" onClick={remove}>Delete</Button>
                <Button onClick={save}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
