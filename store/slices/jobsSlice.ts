import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface JobState {
  isLoading: boolean;
  error: string | null;
  jobs: any[];
  jobPosts: any[];
  currentJob: any | null;
  currentJobPost: any | null;
  applicationForm: {
    currentStep: number;
    parsedData: any | null;
    resumeFileName: string | null;
    resumeFileSize: number | null;
    resumeBase64: string | null;
    personalInfo: {
      fullName: string;
      email: string;
      phone: string;
      location: string;
    };
    professionalDetails: {
      yearsExperience: string;
      currentCompany: string;
    };
    onlineProfiles: {
      linkedinUrl: string;
      githubUrl: string;
    };
    customAnswers: Array<{ question: string; answer: string }>;
    consents: {
      consentPrivacy: boolean;
      consentData: boolean;
      consentComms: boolean;
    };
  };
}

const initialApplicationForm = {
  currentStep: 1,
  parsedData: null,
  resumeFileName: null,
  resumeFileSize: null,
  resumeBase64: null,
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
  },
  professionalDetails: {
    yearsExperience: '',
    currentCompany: '',
  },
  onlineProfiles: {
    linkedinUrl: '',
    githubUrl: '',
  },
  customAnswers: [],
  consents: {
    consentPrivacy: false,
    consentData: false,

    consentComms: false,
  },
};

const isClient = typeof window !== 'undefined';

const getLocalStorage = (key: string, defaultValue: any) => {
  if (!isClient) return defaultValue;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const saveToLocalStorage = (key: string, data: any) => {
  if (isClient) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }
};

const initialState: JobState = {
  isLoading: false,
  error: null,
  jobs: [],
  jobPosts: [],
  currentJob: null,
  currentJobPost: null,
  applicationForm: getLocalStorage('job_application_form', initialApplicationForm),
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    // Jobs
    fetchJobByIdRequest(state, _action: PayloadAction<{ jobId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchJobByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentJob = action.payload;
    },
    fetchJobByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateJobRequest(state, _action: PayloadAction<{ jobId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateJobSuccess(state) {
      state.isLoading = false;
    },
    updateJobFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    applyToJobRequest(state, _action: PayloadAction<{ jobId: string; payload: FormData; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    applyToJobSuccess(state) {
      state.isLoading = false;
    },
    applyToJobFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Job Posts
    fetchJobPostsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchJobPostsSuccess(state, action: PayloadAction<any[]>) {
      state.isLoading = false;
      state.jobPosts = action.payload;
    },
    fetchJobPostsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchJobPostByIdRequest(state, _action: PayloadAction<{ id: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchJobPostByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentJobPost = action.payload;
    },
    fetchJobPostByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    createJobPostRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createJobPostSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      if (action.payload) {
        state.jobPosts.unshift(action.payload);
      }
    },
    createJobPostFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateJobPostRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateJobPostSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      if (action.payload) {
        const idx = state.jobPosts.findIndex((j: any) => j.id === action.payload.id);
        if (idx !== -1) {
          state.jobPosts[idx] = action.payload;
        }
      }
    },
    updateJobPostFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteJobPostRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    deleteJobPostSuccess(state, action: PayloadAction<string>) {
      state.isLoading = false;
      if (action.payload) {
        state.jobPosts = state.jobPosts.filter((j: any) => j.id !== action.payload);
      }
    },
    deleteJobPostFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Applications & Invites within Job Posts
    updateJobApplicationStatusRequest(state, _action: PayloadAction<{ jobId: string; appId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateJobApplicationStatusSuccess(state) {
      state.isLoading = false;
    },
    updateJobApplicationStatusFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    inviteCandidateRequest(state, _action: PayloadAction<{ jobId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    inviteCandidateSuccess(state) {
      state.isLoading = false;
    },
    inviteCandidateFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchJobApplicationsRequest(state, _action: PayloadAction<{ jobId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      // Background request
    },

    sendCandidateEmailRequest(state, _action: PayloadAction<{ payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      // Background request
    },

    fetchInterviewsRequest(state, _action: PayloadAction<{ organizationId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchInterviewsSuccess(state) {
      state.isLoading = false;
    },
    fetchInterviewsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    generateZoomLinkRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    generateZoomLinkSuccess(state) {
      state.isLoading = false;
    },
    generateZoomLinkFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    cancelInterviewRequest(state, _action: PayloadAction<{ id: string; payload?: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    cancelInterviewSuccess(state) {
      state.isLoading = false;
    },
    cancelInterviewFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    rejectRescheduleRequest(state, _action: PayloadAction<{ id: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    rejectRescheduleSuccess(state) {
      state.isLoading = false;
    },
    rejectRescheduleFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    generateJdRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    generateJdSuccess(state) {
      state.isLoading = false;
    },
    generateJdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchPublicJobByIdRequest(state, _action: PayloadAction<{ jobId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchPublicJobByIdSuccess(state, action: PayloadAction<any>) {
      state.isLoading = false;
      state.currentJob = action.payload;
    },
    fetchPublicJobByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchAssignedCandidatesRequest(state, _action: PayloadAction<{ resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      // background request
    },
    suggestSkillsRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      // background request
    },
    parseResumeRequest(state, _action: PayloadAction<{ payload: FormData; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    parseResumeSuccess(state) {
      state.isLoading = false;
    },
    parseResumeFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    scoreApplicationRequest(state, _action: PayloadAction<{ jobId: string; appId: string; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    scoreApplicationSuccess(state) {
      state.isLoading = false;
    },
    scoreApplicationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    bulkUpdateApplicationsRequest(state, _action: PayloadAction<{ jobId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    bulkUpdateApplicationsSuccess(state) {
      state.isLoading = false;
    },
    bulkUpdateApplicationsFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    setApplicationStep(state, action: PayloadAction<number>) {
      state.applicationForm.currentStep = action.payload;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    updateParsedData(state, action: PayloadAction<any>) {
      state.applicationForm.parsedData = action.payload;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    setResumeFileMetadata(state, action: PayloadAction<{ name: string | null; size: number | null; base64: string | null }>) {
      state.applicationForm.resumeFileName = action.payload.name;
      state.applicationForm.resumeFileSize = action.payload.size;
      state.applicationForm.resumeBase64 = action.payload.base64;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    updatePersonalInfo(state, action: PayloadAction<{ fullName: string; email: string; phone: string; location: string }>) {
      state.applicationForm.personalInfo = action.payload;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    updateProfessionalDetails(state, action: PayloadAction<{ yearsExperience: string; currentCompany: string }>) {
      state.applicationForm.professionalDetails = action.payload;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    updateOnlineProfiles(state, action: PayloadAction<{ linkedinUrl: string; githubUrl: string }>) {
      state.applicationForm.onlineProfiles = action.payload;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    updateCustomAnswers(state, action: PayloadAction<Array<{ question: string; answer: string }>>) {
      state.applicationForm.customAnswers = action.payload;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    updateConsents(state, action: PayloadAction<{ consentPrivacy: boolean; consentData: boolean; consentComms: boolean }>) {
      state.applicationForm.consents = action.payload;
      saveToLocalStorage('job_application_form', state.applicationForm);
    },
    clearApplicationForm(state) {
      state.applicationForm = {
        currentStep: 1,
        parsedData: null,
        resumeFileName: null,
        resumeFileSize: null,
        resumeBase64: null,
        personalInfo: {
          fullName: '',
          email: '',
          phone: '',
          location: '',
        },
        professionalDetails: {
          yearsExperience: '',
          currentCompany: '',
        },
        onlineProfiles: {
          linkedinUrl: '',
          githubUrl: '',
        },
        customAnswers: [],
        consents: {
          consentPrivacy: false,
          consentData: false,
          consentComms: false,
        },
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('job_application_form');
        } catch (e) {}
      }
    },

    // Interviews CRUD (for components)
    createInterviewRequest(state, _action: PayloadAction<{ payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    createInterviewSuccess(state) {
      state.isLoading = false;
    },
    createInterviewFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateInterviewRequest(state, _action: PayloadAction<{ id: string; payload: any; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    updateInterviewSuccess(state) {
      state.isLoading = false;
    },
    updateInterviewFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchInterviewsByApplicationRequest(state, _action: PayloadAction<{ applicationId: string; resolve?: (data: any[]) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchInterviewsByApplicationSuccess(state) {
      state.isLoading = false;
    },
    fetchInterviewsByApplicationFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    submitInterviewFeedbackRequest(state, _action: PayloadAction<{ interviewId: string; payload: any; resolve?: () => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    submitInterviewFeedbackSuccess(state) {
      state.isLoading = false;
    },
    submitInterviewFeedbackFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchEvaluationTemplateByIdRequest(state, _action: PayloadAction<{ templateId: string; resolve?: (data: any) => void; reject?: (err: string) => void }>) {
      state.isLoading = true;
    },
    fetchEvaluationTemplateByIdSuccess(state) {
      state.isLoading = false;
    },
    fetchEvaluationTemplateByIdFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },

});

export const jobsActions = jobsSlice.actions;
export default jobsSlice.reducer;
