"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { jobsActions } from "@/store/slices/jobsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, BackButton } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { JobSkillsInput } from "@/components/JobSkillsInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { departmentsActions } from "@/store/slices/departmentsSlice";
import { questionPapersActions } from "@/store/slices/questionPapersSlice";

export default function CreateJobPostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [duration, setDuration] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState("none");
  const [skills, setSkills] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [customQuestions, setCustomQuestions] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const dispatch = useDispatch();
  
  const DRAFT_KEY = "create-job-draft";

  // Load draft from localStorage on initial render
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.experience) setExperience(parsed.experience);
        if (parsed.departmentId) setDepartmentId(parsed.departmentId);
        if (parsed.employmentType) setEmploymentType(parsed.employmentType);
        if (parsed.duration) setDuration(parsed.duration);
        if (parsed.skills) setSkills(parsed.skills);
        if (parsed.salaryMin) setSalaryMin(parsed.salaryMin);
        if (parsed.salaryMax) setSalaryMax(parsed.salaryMax);
        if (parsed.selectedPaperId) setSelectedPaperId(parsed.selectedPaperId);
        if (Array.isArray(parsed.customQuestions)) setCustomQuestions(parsed.customQuestions);
      } catch (e) {}
    }
    setIsDraftLoaded(true);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isDraftLoaded) {
      const draft = {
        title, description, location, experience, departmentId,
        employmentType, duration, skills, salaryMin, salaryMax, customQuestions,
        selectedPaperId
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [
    title, description, location, experience, departmentId, 
    employmentType, duration, skills, salaryMin, salaryMax, customQuestions, selectedPaperId, isDraftLoaded
  ]);

  const clearDraft = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setExperience("");
    setDepartmentId("");
    setEmploymentType("");
    setDuration("");
    setSkills([]);
    setSalaryMin("");
    setSalaryMax("");
    setSelectedPaperId("none");
    setCustomQuestions([""]);
    setFieldErrors({});
    setError("");
    localStorage.removeItem(DRAFT_KEY);
  };

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

  async function createJob() {
    setError("");
    setFieldErrors({});
    if (!orgId) {
      setError("Organization not found for current user");
      return;
    }
    
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
    dispatch(jobsActions.createJobPostRequest({
      payload: {
        organizationId: orgId,
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
        createdBy: user?.id,
        questionPaperId: selectedPaperId === "none" ? null : selectedPaperId,
      },
      resolve: () => {
        localStorage.removeItem(DRAFT_KEY);
        router.push("/job-posts");
      },
      reject: (err) => {
        setError(err || "Failed to create job");
        setLoading(false);
      }
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton href="/job-posts" />
          <PageHeader title="Create Job Post" description="Create a new job opening" />
        </div>

        <div className="max-w-4xl">
          <Card>
            <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
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
                  <Input placeholder="E.g. Full-time, Contract" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <Input placeholder="E.g. Mid-Senior level" value={experience} onChange={(e) => setExperience(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input placeholder="E.g. 6 Months (if contract)" value={duration} onChange={(e) => setDuration(e.target.value)} />
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
                <Button variant="ghost" onClick={clearDraft} disabled={loading} type="button">Clear Draft</Button>
                <Button variant="outline" onClick={() => router.push("/job-posts")} type="button">Cancel</Button>
                <Button onClick={createJob} disabled={loading}>{loading ? "Creating..." : "Create Job Post"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
