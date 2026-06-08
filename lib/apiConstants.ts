export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  LOGOUT_ALL: '/api/auth/logout-all',
  CHECK_SESSION: '/api/auth/check-session',
  SWITCH_TENANT: '/api/auth/switch-tenant',

  // Organizations
  GET_ORGANIZATIONS: '/api/organizations',

  // Projects
  GET_PROJECTS: '/api/projects',

  // Jobs
  GET_JOBS: '/api/jobs',

  // Question Papers & Attempts
  GENERATE_PAPER: '/api/question-papers/generate',
  TOGGLE_PUBLIC: (paperId: string) => `/api/question-papers/${paperId}/toggle-public`,
  CREATE_ATTEMPT: (paperId: string) => `/api/question-papers/${paperId}/attempts`,
  START_ATTEMPT: (paperId: string, attemptId: string) => `/api/question-papers/${paperId}/attempts/${attemptId}/start`,
  REPORT_VIOLATION: (paperId: string, attemptId: string) => `/api/question-papers/${paperId}/attempts/${attemptId}/violations`,
  SUBMIT_ATTEMPT: (paperId: string, attemptId: string) => `/api/question-papers/${paperId}/attempts/${attemptId}/submit`,
  EVALUATE_ATTEMPT: (paperId: string, attemptId: string) => `/api/question-papers/${paperId}/attempts/${attemptId}/evaluate`,
  INVITE_CANDIDATE: (paperId: string) => `/api/question-papers/${paperId}/invite`,
  UPLOAD: '/api/upload',
  
  // Question Library
  LIBRARY_QUESTIONS: '/api/library-questions',
  LIBRARY_QUESTION_BY_ID: (id: string) => `/api/library-questions/${id}`,
  LIBRARY_QUESTIONS_GENERATE: '/api/library-questions/generate',

  // Skills & Departments (used in Wizard)
  GET_DEPARTMENTS: '/api/departments',
  SUGGEST_SKILLS: '/api/skills/suggest',
  SEARCH_SKILLS: '/api/skills/search',

  // Subscriptions & Billing
  GET_PAYMENTS: '/api/payments',
  GET_SUBSCRIPTIONS: '/api/subscriptions/current',

  // Invites
  GET_INVITES: '/api/invites',
  GET_ROLES: '/api/roles',
  GET_USERS: '/api/users',

  // ... (Add more specific endpoints dynamically using functions if they have params)

  // Job Applications (Refactored)
  PARSE_RESUME: '/api/parse-resume',
  UPDATE_APPLICATION: (jobId: string, appId: string) => `/api/job-posts/${jobId}/applications/${appId}`,
  SCORE_APPLICATION: (jobId: string, appId: string) => `/api/jobs/${jobId}/applications/${appId}/score`,
  BULK_UPDATE_APPLICATIONS: (jobId: string) => `/api/job-posts/${jobId}/applications/bulk`,
  GENERATE_JD: '/api/jobs/generate-jd',
  GET_PUBLIC_JOB: (jobId: string) => `/api/public/jobs/${jobId}`,
  GET_ASSIGNED_CANDIDATES: '/api/candidates/assigned',

  // Users & Organizations
  GET_USER: (userId: string) => `/api/users/${userId}`,
  GET_ORGANIZATION: (orgId: string) => `/api/organizations/${orgId}`,
  UPDATE_ORGANIZATION: (orgId: string) => `/api/organizations/${orgId}`,

  // Auth & MFA
  MFA_SETUP: '/api/auth/mfa/setup',
  MFA_VERIFY: '/api/auth/mfa/verify',
  MFA_DISABLE: '/api/auth/mfa/disable',
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
