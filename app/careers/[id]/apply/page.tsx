"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { jobsActions } from "@/store/slices/jobsSlice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Briefcase, MapPin, Building2, UploadCloud, ChevronRight, ChevronLeft, Mail, Trash2, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

const STATUS_CONFIG: Record<string, { label: string; emoji: string; msg: string; bg: string; iconBg: string }> = {
  closed: {
    label: "Position Closed",
    emoji: "🔴",
    msg: "This position has been closed and is no longer accepting new applications. Thank you for your interest.",
    bg: "bg-red-50",
    iconBg: "bg-red-100",
  },
  paused: {
    label: "Hiring Paused",
    emoji: "🟡",
    msg: "Hiring for this position has been temporarily paused. Please check back later or contact the team.",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
  },
  filled: {
    label: "Position Filled",
    emoji: "🔵",
    msg: "This position has already been filled. We appreciate your interest and encourage you to apply for future openings.",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
  },
  draft: {
    label: "Not Yet Open",
    emoji: "⚪",
    msg: "This job posting is not yet open for applications. Please check back soon.",
    bg: "bg-slate-50",
    iconBg: "bg-slate-100",
  },
};

const DEFAULT_QUESTIONS = [
  "What programming languages or technologies are you most comfortable with?",
  "Describe a project you worked on and your specific contribution.",
  "Why are you interested in starting your career in the IT industry?",
  "How do you handle debugging a complex issue or error in your code?",
  "Where do you see yourself technically in the next 2-3 years?",
];

const WIZARD_STEPS = [
  { id: 1, label: "Resume Upload" },
  { id: 2, label: "Details" },
  { id: 3, label: "Questions" },
  { id: 4, label: "Consents" },
  { id: 5, label: "Review & Submit" }
];

// Helper to convert base64 to File object
const dataURLtoFile = (dataurl: string, filename: string) => {
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.error("dataURLtoFile conversion failed", e);
    return null;
  }
};

export default function CareerApplyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [ok, setOk] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateReasons, setDuplicateReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  const dispatch = useDispatch();

  // Get application form state from Redux
  const { applicationForm, isLoading } = useSelector((state: any) => state.jobs);
  const {
    currentStep,
    parsedData,
    resumeFileName,
    resumeFileSize,
    resumeBase64,
    personalInfo,
    professionalDetails,
    onlineProfiles,
    customAnswers,
    consents
  } = applicationForm;

  // Local state for Step 2 inputs, initialized from Redux state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [yearsExperience, setYearsExperience] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  // Local state for Step 3 screening answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editableParsed, setEditableParsed] = useState<any>({
    skills: [],
    education: [],
    workHistory: [],
    projects: [],
    socialLinks: [],
  });

  // Local state for Step 4 consents
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [consentComms, setConsentComms] = useState(false);

  // Keep reference of uploaded file in local memory
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch Job Post
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          dispatch(jobsActions.fetchPublicJobByIdRequest({
            jobId: id as string,
            resolve: (data) => {
              setJob(data);
              resolve();
            },
            reject
          }));
        });
      } catch (err: any) {
        setErrorMsg(err || "Failed to load job details.");
      }
    })();
  }, [id, dispatch]);

  // Reconstruct file from Redux base64 on mount / load
  useEffect(() => {
    if (!resumeFile && resumeBase64 && resumeFileName) {
      const file = dataURLtoFile(resumeBase64, resumeFileName);
      if (file) {
        setResumeFile(file);
      }
    }
  }, [resumeFile, resumeBase64, resumeFileName]);

  // Sync Redux values to local state whenever they are updated/loaded from localStorage
  useEffect(() => {
    if (personalInfo) {
      setFullName(personalInfo.fullName || "");
      setEmail(personalInfo.email || "");
      setPhone(personalInfo.phone || "");
      setLocation(personalInfo.location || "");
    }
  }, [personalInfo]);

  useEffect(() => {
    if (professionalDetails) {
      setYearsExperience(professionalDetails.yearsExperience || "");
      setCurrentCompany(professionalDetails.currentCompany || "");
    }
  }, [professionalDetails]);

  useEffect(() => {
    if (onlineProfiles) {
      setLinkedinUrl(onlineProfiles.linkedinUrl || "");
      setGithubUrl(onlineProfiles.githubUrl || "");
    }
  }, [onlineProfiles]);

  useEffect(() => {
    if (customAnswers && customAnswers.length > 0) {
      const answersMap: Record<string, string> = {};
      customAnswers.forEach((item: any) => {
        answersMap[item.question] = item.answer;
      });
      setAnswers(answersMap);
    }
  }, [customAnswers]);

  useEffect(() => {
    if (consents) {
      setConsentPrivacy(consents.consentPrivacy || false);
      setConsentData(consents.consentData || false);
      setConsentComms(consents.consentComms || false);
    }
  }, [consents]);

  useEffect(() => {
    if (!parsedData) return;
    setEditableParsed({
      skills: parsedData.skills || [],
      education: parsedData.education || [],
      workHistory: parsedData.workHistory || [],
      projects: parsedData.projects || [],
      socialLinks: parsedData.socialLinks || [],
    });
  }, [parsedData]);

  const screeningQuestions = (Array.isArray(job?.customQuestions) && job.customQuestions.length > 0
    ? job.customQuestions.slice(0, 5)
    : DEFAULT_QUESTIONS
  ).map((q: any) => typeof q === "string" ? q : String(q?.question || q?.text || "").trim()).filter(Boolean);

  // Handle Resume Upload & Auto-Populate details
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("File size must be under 2MB.");
      return;
    }
    
    setErrorMsg("");
    setResumeFile(file);
    setLoading(true);
    setUploadProgress(10);

    // Simulate progress bar while parsing
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 400);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const data = await new Promise<any>((resolve, reject) => {
        dispatch(jobsActions.parseResumeRequest({
          payload: formData,
          resolve,
          reject
        }));
      });
      
      clearInterval(interval);
      setUploadProgress(100);

      // Store parsed text content in Redux
      dispatch(jobsActions.updateParsedData(data));

      // Read file as base64 and store in Redux for reload persistence
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        dispatch(jobsActions.setResumeFileMetadata({
          name: file.name,
          size: file.size,
          base64: base64String
        }));
      };
      reader.readAsDataURL(file);

      // Automatically pre-populate personal details if found
      if (data.personalInfo) {
        dispatch(jobsActions.updatePersonalInfo({
          fullName: data.personalInfo.fullName || personalInfo.fullName || "",
          email: data.personalInfo.email || personalInfo.email || "",
          phone: data.personalInfo.phone || personalInfo.phone || "",
          location: data.personalInfo.location || personalInfo.location || ""
        }));
      }

      // Automatically pre-populate professional details if found
      if (data.professionalDetails) {
        dispatch(jobsActions.updateProfessionalDetails({
          yearsExperience: String(data.professionalDetails.totalYearsExperience || professionalDetails.yearsExperience || ""),
          currentCompany: data.professionalDetails.currentCompany || professionalDetails.currentCompany || ""
        }));
      }

      // Automatically pre-populate LinkedIn & GitHub from parsed socialLinks if found
      let extractedLinkedin = "";
      let extractedGithub = "";
      if (data.socialLinks && Array.isArray(data.socialLinks)) {
        const li = data.socialLinks.find((l: any) => l.platform?.toLowerCase().includes("linkedin") || l.url?.toLowerCase().includes("linkedin"));
        if (li) extractedLinkedin = li.url;

        const gh = data.socialLinks.find((l: any) => l.platform?.toLowerCase().includes("github") || l.url?.toLowerCase().includes("github"));
        if (gh) extractedGithub = gh.url;
      }

      dispatch(jobsActions.updateOnlineProfiles({
        linkedinUrl: extractedLinkedin || onlineProfiles.linkedinUrl || "",
        githubUrl: extractedGithub || onlineProfiles.githubUrl || "",
      }));

      setTimeout(() => {
        setLoading(false);
      }, 300);
      
    } catch (err: any) {
      clearInterval(interval);
      setLoading(false);
      setUploadProgress(0);
      setResumeFile(null);
      setErrorMsg(err.message || "An error occurred during resume upload.");
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    dispatch(jobsActions.updateParsedData(null));
    dispatch(jobsActions.setResumeFileMetadata({ name: null, size: null }));
    setUploadProgress(0);
  };

  // Step 2 Submission (Details Form)
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !location || !yearsExperience || !linkedinUrl || !githubUrl) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    setErrorMsg("");
    // Save to Redux
    dispatch(jobsActions.updatePersonalInfo({ fullName, email, phone, location }));
    dispatch(jobsActions.updateProfessionalDetails({ yearsExperience, currentCompany }));
    dispatch(jobsActions.updateOnlineProfiles({ linkedinUrl, githubUrl }));
    // Proceed to Step 3
    dispatch(jobsActions.setApplicationStep(3));
  };

  // Step 3 Submission (Screening Questions)
  const handleQuestionsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that all questions are answered
    for (let i = 0; i < screeningQuestions.length; i++) {
      const q = screeningQuestions[i];
      if (!answers[q] || answers[q].trim().length < 5) {
        setErrorMsg("Please provide complete answers to all screening questions (minimum 5 characters).");
        return;
      }
    }
    setErrorMsg("");
    // Save to Redux
    const answersList = screeningQuestions.map((q) => ({
      question: q,
      answer: answers[q] || ""
    }));
    dispatch(jobsActions.updateCustomAnswers(answersList));
    // Proceed to Step 4
    dispatch(jobsActions.setApplicationStep(4));
  };

  // Step 4 Submission (Consents)
  const handleConsentsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentPrivacy || !consentData || !consentComms) {
      setErrorMsg("Please agree to all consents to proceed.");
      return;
    }
    setErrorMsg("");
    // Save to Redux
    dispatch(jobsActions.updateConsents({ consentPrivacy, consentData, consentComms }));
    // Proceed to Step 5
    dispatch(jobsActions.setApplicationStep(5));
  };

  // Final Form Submit (Step 5)
  const handleFinalSubmit = () => {
    if (!consentPrivacy || !consentData || !consentComms) {
      setErrorMsg("Consents missing or incomplete.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const finalForm = new FormData();
    
    // Attach fields
    finalForm.append('fullName', personalInfo.fullName);
    finalForm.append('email', personalInfo.email);
    finalForm.append('phone', personalInfo.phone);
    finalForm.append('location', personalInfo.location);
    finalForm.append('yearsExperience', professionalDetails.yearsExperience);
    finalForm.append('currentCompany', professionalDetails.currentCompany);
    finalForm.append('linkedinUrl', onlineProfiles.linkedinUrl);
    finalForm.append('githubUrl', onlineProfiles.githubUrl);

    // Consent options
    finalForm.append('consentPrivacyPolicy', 'true');
    finalForm.append('consentDataProcessing', 'true');
    finalForm.append('consentCommunication', 'true');

    // Attach parsed resume arrays
    if (parsedData) {
      finalForm.append('parsedSkills', JSON.stringify(editableParsed.skills || []));
      finalForm.append('parsedEducation', JSON.stringify(parsedData.education || []));
      finalForm.append('parsedWorkHistory', JSON.stringify(parsedData.workHistory || []));
      finalForm.append('parsedProjects', JSON.stringify(parsedData.projects || []));
      finalForm.append('parsedSocialLinks', JSON.stringify(parsedData.socialLinks || []));
      finalForm.append('parsedCertificates', JSON.stringify(parsedData.certificates || []));
      finalForm.append('parsedAchievements', JSON.stringify(parsedData.achievements || []));
      finalForm.append('parsedSummary', parsedData.summary || "");
    }

    // Screening answers
    finalForm.append('customAnswers', JSON.stringify(customAnswers || []));

    // File check: If page was refreshed, resumeFile in memory is lost. We check for it.
    if (resumeFile) {
      finalForm.append('resume', resumeFile);
    } else {
      setLoading(false);
      setErrorMsg("Your uploaded resume file is missing from memory due to a page refresh. Please go back to Step 1 and re-attach your resume before submitting.");
      return;
    }

    dispatch(jobsActions.applyToJobRequest({
      jobId: id,
      payload: finalForm,
      resolve: () => {
        setLoading(false);
        setOk(true);
        setSubmitted(true);
        // Clear all persisted application state from Redux & LocalStorage on success
        dispatch(jobsActions.clearApplicationForm());
      },
      reject: (err) => {
        setLoading(false);
        const duplicate = (err && typeof err === "object" && err.duplicate) ? err.duplicate : null;
        if (duplicate) {
          const reasons: string[] = [];
          if (duplicate.emailUsed) reasons.push("This email is already used for this job.");
          if (duplicate.phoneUsed) reasons.push("This phone number is already used for this job.");
          setDuplicateReasons(reasons.length ? reasons : ["You have already applied for this job."]);
          setDuplicateOpen(true);
          setErrorMsg("");
        } else if (typeof err === "string" && (err.toLowerCase().includes("duplicate") || err.toLowerCase().includes("already"))) {
          setDuplicateReasons(["You have already applied for this job with this contact information."]);
          setDuplicateOpen(true);
          setErrorMsg("");
        } else {
          setErrorMsg((typeof err === "string" ? err : err?.error) || "Failed to apply. Please try again.");
        }
      }
    }));
  };

  // Navigation handlers
  const prevStep = () => {
    if (currentStep > 1) {
      setErrorMsg("");
      dispatch(jobsActions.setApplicationStep(currentStep - 1));
    }
  };

  const jobNotOpen = job && job.status && job.status !== "open";
  const statusCfg = jobNotOpen
    ? STATUS_CONFIG[job.status] ?? {
        label: "Application Unavailable",
        emoji: "⛔",
        msg: "This application link is currently not active.",
        bg: "bg-muted",
        iconBg: "bg-muted",
      }
    : null;

  const brandColor = job?.organization?.primaryColor || '#000000';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 font-sans">
      
      {/* ── Dynamic Branding Styles ── */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --brand-color: ${brandColor};
        }
        .bg-brand { background-color: var(--brand-color); }
        .text-brand { color: var(--brand-color); }
        .border-brand { border-color: var(--brand-color); }
      `}} />

      {/* ── Job Closed / Paused Overlay ── */}
      {jobNotOpen && statusCfg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className={`${statusCfg.bg} px-8 pt-8 pb-6 text-center border-b`}>
              <div className={`mx-auto w-20 h-20 rounded-full ${statusCfg.iconBg} flex items-center justify-center text-4xl mb-4 shadow-sm`}>
                {statusCfg.emoji}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{statusCfg.label}</h2>
              {job?.title && (
                <p className="text-sm text-gray-500 mt-1 font-semibold">{job.title}</p>
              )}
            </div>
            <div className="px-8 py-7 text-center space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed">{statusCfg.msg}</p>
              {job?.organization?.email ? (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Questions? Reach out to us</p>
                  <a
                    href={`mailto:${job.organization.email}?subject=Application Enquiry — ${encodeURIComponent(job.title ?? "")}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 transition-colors w-full justify-center"
                  >
                    <Mail className="w-4 h-4" />
                    Contact Administration
                  </a>
                  <p className="text-xs text-gray-400">{job.organization.email}</p>
                </div>
              ) : (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-400">Please contact your recruiter directly for further assistance.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {!submitted && (
          <>
            {/* Job Header */}
            <div className="text-center space-y-4 mb-8">
              {job?.organization?.logo && (
                <img src={job.organization.logo} alt="Company Logo" className="h-16 object-contain mx-auto mb-4" />
              )}
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {job ? job.title : "Apply for Position"}
              </h1>
              {job && (
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 pt-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  {job.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  {job.employmentType && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span className="capitalize">{job.employmentType}</span>
                    </div>
                  )}
                  {job.experience && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{job.experience}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Wizard Progress Bar ── */}
            <div className="relative max-w-2xl mx-auto px-1 sm:px-4 mb-8 sm:mb-10 overflow-x-auto">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-brand -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
                style={{ width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
              />
              <div className="relative flex justify-between z-10 min-w-[520px] sm:min-w-0">
                {WIZARD_STEPS.map((s) => {
                  const isActive = currentStep === s.id;
                  const isCompleted = currentStep > s.id;
                  return (
                    <div key={s.id} className="flex flex-col items-center">
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                          isCompleted 
                            ? "bg-brand border-brand text-white" 
                            : isActive 
                              ? "bg-white dark:bg-zinc-900 border-brand text-brand shadow-md scale-110" 
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : s.id}
                      </div>
                      <span className={`text-[11px] mt-2 font-semibold block ${isActive ? "text-brand" : "text-zinc-400"}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Application Card */}
        {submitted ? (
          <Card className="border shadow-lg rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 text-center py-20 px-4">
            <CardContent className="space-y-6">
              <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">You're all set!</h2>
              <p className="text-zinc-500 text-lg max-w-md mx-auto mb-8">
                We've successfully received your application. Keep an eye on your inbox for next steps.
              </p>
              <Button
                variant="outline"
                className="mt-6 rounded-full px-8 py-6 font-semibold"
                onClick={() => router.push('/careers')}
              >
                Return to Careers
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-xl shadow-zinc-200/50 dark:shadow-none rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 pt-0">
            <div className="h-[6px] w-full bg-brand" />

            <CardHeader className="space-y-2 pb-5 pt-6 sm:pt-8 px-4 sm:px-8 md:px-12">
              <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {WIZARD_STEPS[currentStep - 1].label}
              </CardTitle>
              <CardDescription className="text-base text-zinc-500">
                {currentStep === 1 && "Upload your resume in PDF or DOCX format. We will extract details instantly."}
                {currentStep === 2 && "Review or modify the extracted contact details and professional background."}
                {currentStep === 3 && "Answer screening questions to help recruiters understand your profile better."}
                {currentStep === 4 && "Review legal guidelines and provide your consent to submit the application."}
                {currentStep === 5 && "Take a final look at your application data and submit when ready."}
              </CardDescription>
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 mt-4 font-medium flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </CardHeader>

            <CardContent className="px-4 sm:px-8 md:px-12 pb-8 sm:pb-10">
              
              {/* ───────────────── STEP 1: RESUME UPLOAD ───────────────── */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Premium Success Banner placed AT THE TOP, right above the upload box */}
                  {parsedData && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4 text-sm text-blue-800 flex gap-4 items-start shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                      <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-base block text-blue-900">Resume Parsed Successfully!</span>
                        <p className="text-blue-700 font-medium">
                          We've extracted <span className="font-bold">{parsedData.skills?.length || 0}</span> skills,{" "}
                          <span className="font-bold">{parsedData.education?.length || 0}</span> education records, and{" "}
                          <span className="font-bold">{parsedData.workHistory?.length || 0}</span> work history records from your resume.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative group bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 sm:p-8 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-brand transition-colors">
                    {loading ? (
                      <div className="space-y-4 max-w-xs mx-auto py-8">
                        <UploadCloud className="h-10 w-10 text-brand mx-auto animate-bounce" />
                        <p className="text-sm font-medium">Extracting resume details... {uploadProgress}%</p>
                        <Progress value={uploadProgress} className="h-2 w-full bg-zinc-200" />
                      </div>
                    ) : parsedData ? (
                      <div className="py-6 space-y-4">
                        <div className="flex items-center justify-between max-w-md mx-auto p-4 bg-white dark:bg-zinc-800 rounded-xl border shadow-sm">
                          <div className="flex items-center gap-3">
                            <UploadCloud className="h-6 w-6 text-brand" />
                            <div className="text-left">
                              <p className="text-sm font-semibold truncate max-w-[200px]">
                                {resumeFileName || "Attached Resume"}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {resumeFileSize ? `${(resumeFileSize / 1024 / 1024).toFixed(2)} MB` : "File attached"}
                              </p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={removeResume} className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-zinc-400">Want to change your resume? Click remove to upload another one.</p>
                      </div>
                    ) : (
                      <div className="py-8">
                        <UploadCloud className="h-12 w-12 text-zinc-400 group-hover:text-brand transition-colors mb-4 mx-auto" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Click to upload or drag and drop</h3>
                        <p className="text-sm text-zinc-500 mb-6">PDF, DOCX, JPG, or PNG (Max 2MB)</p>
                        <Button type="button" className="bg-brand text-white hover:opacity-90 rounded-full relative overflow-hidden px-8">
                          Select File
                          <input
                            type="file"
                            accept=".pdf,.docx,.jpg,.jpeg,.png"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleResumeUpload}
                          />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => dispatch(jobsActions.setApplicationStep(2))}
                      disabled={!parsedData}
                      className="w-full sm:w-auto rounded-full px-8 bg-brand text-white hover:opacity-90 gap-2 h-11"
                    >
                      Next: Candidate Details <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ───────────────── STEP 2: DETAILS FORM ───────────────── */}
              {currentStep === 2 && (
                <form onSubmit={handleDetailsSubmit} className="space-y-8 animate-in fade-in duration-300">
                  {/* Personal Info */}
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Full Name <span className="text-red-500">*</span></Label>
                        <Input 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)} 
                          placeholder="Jane Doe" 
                          className="bg-transparent h-11" 
                          required 
                          minLength={3} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Email Address <span className="text-red-500">*</span></Label>
                        <Input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="jane@example.com" 
                          className="bg-transparent h-11" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Phone Number <span className="text-red-500">*</span></Label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          pattern="^(\+91[\-\s]?)?[6-9]\d{9}$"
                          title="Please enter a valid 10-digit Indian phone number"
                          className="bg-transparent h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Current Location <span className="text-red-500">*</span></Label>
                        <Input 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)} 
                          placeholder="City, State" 
                          className="bg-transparent h-11" 
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2">Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Years of Experience <span className="text-red-500">*</span></Label>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.5" 
                          value={yearsExperience} 
                          onChange={(e) => setYearsExperience(e.target.value)} 
                          placeholder="e.g. 4.5" 
                          className="bg-transparent h-11" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Current Company <span className="text-muted-foreground text-xs font-normal">(Optional)</span></Label>
                        <Input 
                          value={currentCompany} 
                          onChange={(e) => setCurrentCompany(e.target.value)} 
                          placeholder="Most recent employer" 
                          className="bg-transparent h-11" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Online Profiles */}
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2">Online Profiles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">LinkedIn URL <span className="text-red-500">*</span></Label>
                        <Input 
                          type="url" 
                          value={linkedinUrl} 
                          onChange={(e) => setLinkedinUrl(e.target.value)} 
                          placeholder="https://linkedin.com/in/..." 
                          className="bg-transparent h-11" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">GitHub URL <span className="text-red-500">*</span></Label>
                        <Input 
                          type="url" 
                          value={githubUrl} 
                          onChange={(e) => setGithubUrl(e.target.value)} 
                          placeholder="https://github.com/..." 
                          className="bg-transparent h-11" 
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={prevStep} className="w-full sm:w-auto rounded-full gap-2 h-11">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto bg-brand text-white hover:opacity-90 rounded-full px-8 gap-2 h-11">
                      Next: Screening Questions <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* ───────────────── STEP 3: SCREENING QUESTIONS ───────────────── */}
              {currentStep === 3 && (
                <form onSubmit={handleQuestionsSubmit} className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2">Screening Questions</h3>
                    <div className="space-y-6">
                      {screeningQuestions.map((question, index) => (
                        <div key={index} className="space-y-2.5">
                          <Label className="text-sm font-semibold">{question} <span className="text-red-500">*</span></Label>
                          <Textarea
                            value={answers[question] || ""}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [question]: e.target.value }))}
                            placeholder="Type your response here..."
                            className="bg-transparent min-h-[110px]"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={prevStep} className="w-full sm:w-auto rounded-full gap-2 h-11">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto bg-brand text-white hover:opacity-90 rounded-full px-8 gap-2 h-11">
                      Next: Consents <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* ───────────────── STEP 4: CONSENTS ───────────────── */}
              {currentStep === 4 && (
                <form onSubmit={handleConsentsSubmit} className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2">Candidate Consents</h3>
                    <div className="space-y-5 bg-zinc-50 dark:bg-zinc-800/40 p-6 rounded-2xl border">
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          id="consentPrivacy" 
                          checked={consentPrivacy} 
                          onCheckedChange={(c) => setConsentPrivacy(!!c)} 
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor="consentPrivacy" className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I agree to the Terms of Service & Privacy Policy <span className="text-red-500">*</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          id="consentData" 
                          checked={consentData} 
                          onCheckedChange={(c) => setConsentData(!!c)} 
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor="consentData" className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I consent to the processing of my personal and academic data for screening and recruitment <span className="text-red-500">*</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          id="consentComms" 
                          checked={consentComms} 
                          onCheckedChange={(c) => setConsentComms(!!c)} 
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor="consentComms" className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I opt-in to receive email, text messages, and notifications regarding my job application status <span className="text-red-500">*</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={prevStep} className="w-full sm:w-auto rounded-full gap-2 h-11">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto bg-brand text-white hover:opacity-90 rounded-full px-8 gap-2 h-11">
                      Next: Review Application <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* ───────────────── STEP 5: REVIEW & FINAL SUBMIT ───────────────── */}
              {currentStep === 5 && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2">Review Details</h3>
                    
                    {/* Resume File Check Warning */}
                    {!resumeFile && (
                      <div className="bg-amber-50 text-amber-800 p-5 rounded-2xl text-sm border border-amber-200 font-medium flex flex-col gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-900">Resume File Attachment Needed!</p>
                            <p className="text-xs mt-1 text-amber-700">
                              Your form inputs are fully recovered, but browser security requires you to re-attach your resume file to finalize the submission.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 pl-8 border-t border-amber-200/55 pt-3">
                          <Button type="button" variant="outline" className="bg-white hover:bg-zinc-50 border-amber-300 text-amber-800 text-xs rounded-xl relative overflow-hidden h-9 px-4">
                            Re-select Resume File
                            <input
                              type="file"
                              accept=".pdf,.docx,.jpg,.jpeg,.png"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setResumeFile(file);
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const base64String = reader.result as string;
                                    dispatch(jobsActions.setResumeFileMetadata({
                                      name: file.name,
                                      size: file.size,
                                      base64: base64String
                                    }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </Button>
                          {resumeFileName && (
                            <span className="text-xs text-amber-700 italic font-semibold truncate max-w-[240px]">
                              Previous file: {resumeFileName}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-6 bg-zinc-50 dark:bg-zinc-800/40 p-6 md:p-8 rounded-2xl border space-y-6">
                      {/* Personal Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <div>
                          <span className="text-zinc-400 font-medium block">Full Name</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{personalInfo?.fullName}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-medium block">Email Address</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{personalInfo?.email}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-medium block">Phone Number</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{personalInfo?.phone}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-medium block">Current Location</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{personalInfo?.location}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-medium block">Experience</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{professionalDetails?.yearsExperience} years</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-medium block">Current Company</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{professionalDetails?.currentCompany || "None / Not Provided"}</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Online Profiles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-400 font-medium block">LinkedIn Profile</span>
                          <span className="font-semibold text-brand underline truncate block">{onlineProfiles?.linkedinUrl}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-medium block">GitHub Profile</span>
                          <span className="font-semibold text-brand underline truncate block">{onlineProfiles?.githubUrl}</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Extracted stats */}
                      {parsedData && (
                        <div>
                          <span className="text-zinc-400 font-medium block mb-2">Parsed Resume Data</span>
                          <div className="flex gap-4">
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full py-1 px-3">
                              {parsedData.skills?.length || 0} Skills
                            </Badge>
                            <Badge className="bg-green-50 text-green-700 border border-green-100 rounded-full py-1 px-3">
                              {parsedData.education?.length || 0} Education
                            </Badge>
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-100 rounded-full py-1 px-3">
                              {parsedData.workHistory?.length || 0} Companies
                            </Badge>
                          </div>
                          <div className="mt-4 grid grid-cols-1 gap-6">
                            <div>
                              <Label className="text-xs font-semibold text-zinc-500 mb-2 block">Skills</Label>
                              <Textarea
                                value={(editableParsed.skills || []).join(", ")}
                                onChange={(e) => setEditableParsed((p: any) => ({ ...p, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                                className="mt-1 min-h-[70px]"
                              />
                            </div>
                            
                            {parsedData.education?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold text-zinc-500 mb-2 block">Education</Label>
                                <div className="space-y-3">
                                  {parsedData.education.map((edu: any, idx: number) => (
                                    <div key={idx} className="bg-zinc-50 border rounded-lg p-3 text-sm">
                                      <p className="font-semibold text-zinc-900">{edu.degree}</p>
                                      <p className="text-zinc-600">{edu.institution}</p>
                                      <p className="text-zinc-500 text-xs mt-1">{edu.year}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {parsedData.workHistory?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold text-zinc-500 mb-2 block">Work History</Label>
                                <div className="space-y-3">
                                  {parsedData.workHistory.map((work: any, idx: number) => (
                                    <div key={idx} className="bg-zinc-50 border rounded-lg p-3 text-sm">
                                      <p className="font-semibold text-zinc-900">{work.role}</p>
                                      <p className="text-zinc-600">{work.company}</p>
                                      <p className="text-zinc-500 text-xs mt-1">{work.duration}</p>
                                      {work.description && <p className="text-zinc-600 mt-2 text-xs line-clamp-3">{work.description}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={prevStep} className="w-full sm:w-auto rounded-full gap-2 h-11">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleFinalSubmit}
                      disabled={loading || !resumeFile}
                      className="w-full sm:w-auto bg-brand text-white hover:opacity-90 rounded-full px-10 gap-2 h-12 text-base font-bold shadow-lg"
                    >
                      {loading ? "Submitting Application..." : (
                        <>Submit Application <ShieldCheck className="h-5 w-5" /></>
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
