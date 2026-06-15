let APP_URL = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000' ? process.env.NEXT_PUBLIC_APP_URL : '';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/ai-recruitment-platform';

// Automatically extract ONLY the IP address / origin (e.g., http://10.0.0.101)
// This will strip out any accidental /api or /ai-recruitment-platform from the .env URL
if (APP_URL) {
  try {
    APP_URL = new URL(APP_URL).origin;
  } catch (error) {
    console.error("Invalid NEXT_PUBLIC_APP_URL format in .env");
  }
}

const BASE_URL = APP_URL ? `${APP_URL}${BASE_PATH}` : BASE_PATH;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${BASE_URL}/api/auth/login`,
  LOGOUT: `${BASE_URL}/api/auth/logout`,
  LOGOUT_ALL: `${BASE_URL}/api/auth/logout-all`,
  CHECK_SESSION: `${BASE_URL}/api/auth/check-session`,
  SWITCH_TENANT: `${BASE_URL}/api/auth/switch-tenant`,

  // Organizations
  GET_ORGANIZATIONS: `${BASE_URL}/api/organizations`,

  // Projects
  GET_PROJECTS: `${BASE_URL}/api/projects`,

  // Jobs
  GET_JOBS: `${BASE_URL}/api/jobs`,

  // Question Papers & Attempts
  GENERATE_PAPER: `${BASE_URL}/api/question-papers/generate`,
  TOGGLE_PUBLIC: (paperId: string) => `${BASE_URL}/api/question-papers/${paperId}/toggle-public`,
  CREATE_ATTEMPT: (paperId: string) => `${BASE_URL}/api/question-papers/${paperId}/attempts`,
  START_ATTEMPT: (paperId: string, attemptId: string) => `${BASE_URL}/api/question-papers/${paperId}/attempts/${attemptId}/start`,
  REPORT_VIOLATION: (paperId: string, attemptId: string) => `${BASE_URL}/api/question-papers/${paperId}/attempts/${attemptId}/violations`,
  SUBMIT_ATTEMPT: (paperId: string, attemptId: string) => `${BASE_URL}/api/question-papers/${paperId}/attempts/${attemptId}/submit`,
  EVALUATE_ATTEMPT: (paperId: string, attemptId: string) => `${BASE_URL}/api/question-papers/${paperId}/attempts/${attemptId}/evaluate`,
  INVITE_CANDIDATE: (paperId: string) => `${BASE_URL}/api/question-papers/${paperId}/invite`,
  UPLOAD: `${BASE_URL}/api/upload`,
  
  // Question Library
  LIBRARY_QUESTIONS: `${BASE_URL}/api/library-questions`,
  LIBRARY_QUESTION_BY_ID: (id: string) => `${BASE_URL}/api/library-questions/${id}`,
  LIBRARY_QUESTIONS_GENERATE: `${BASE_URL}/api/library-questions/generate`,

  // Skills & Departments (used in Wizard)
  GET_DEPARTMENTS: `${BASE_URL}/api/departments`,
  SUGGEST_SKILLS: `${BASE_URL}/api/skills/suggest`,
  SEARCH_SKILLS: `${BASE_URL}/api/skills/search`,

  // Subscriptions & Billing
  GET_PAYMENTS: `${BASE_URL}/api/payments`,
  GET_SUBSCRIPTIONS: `${BASE_URL}/api/subscriptions/current`,

  // Invites
  GET_INVITES: `${BASE_URL}/api/invites`,
  GET_ROLES: `${BASE_URL}/api/roles`,
  GET_USERS: `${BASE_URL}/api/users`,

  // ... (Add more specific endpoints dynamically using functions if they have params)

  // Job Applications (Refactored)
  PARSE_RESUME: `${BASE_URL}/api/parse-resume`,
  UPDATE_APPLICATION: (jobId: string, appId: string) => `${BASE_URL}/api/job-posts/${jobId}/applications/${appId}`,
  SCORE_APPLICATION: (jobId: string, appId: string) => `${BASE_URL}/api/jobs/${jobId}/applications/${appId}/score`,
  BULK_UPDATE_APPLICATIONS: (jobId: string) => `${BASE_URL}/api/job-posts/${jobId}/applications/bulk`,
  GENERATE_JD: `${BASE_URL}/api/jobs/generate-jd`,
  GET_PUBLIC_JOB: (jobId: string) => `${BASE_URL}/api/public/jobs/${jobId}`,
  GET_ASSIGNED_CANDIDATES: `${BASE_URL}/api/candidates/assigned`,

  // Users & Organizations
  GET_USER: (userId: string) => `${BASE_URL}/api/users/${userId}`,
  GET_ORGANIZATION: (orgId: string) => `${BASE_URL}/api/organizations/${orgId}`,
  UPDATE_ORGANIZATION: (orgId: string) => `${BASE_URL}/api/organizations/${orgId}`,

  // Auth & MFA
  MFA_SETUP: `${BASE_URL}/api/auth/mfa/setup`,
  MFA_VERIFY: `${BASE_URL}/api/auth/mfa/verify`,
  MFA_DISABLE: `${BASE_URL}/api/auth/mfa/disable`,
};

export const buildUrl = (url: string, params: Record<string, string | number | undefined | null>) => {
  const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  Object.keys(params).forEach(key => {
    const val = params[key];
    if (val !== undefined && val !== null) {
      urlObj.searchParams.append(key, String(val));
    }
  });
  return urlObj.pathname + urlObj.search;
};
