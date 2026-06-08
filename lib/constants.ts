// Constants
export const APP_NAME = 'AI Recruitment'
export const APP_DESCRIPTION = 'Multi-tenant SaaS platform with dynamic RBAC'

// Role slugs
export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super-admin',
  ORG_ADMIN: 'org-admin',
  HR: 'hr',
  RECRUITER: 'recruiter',
  DEVELOPER: 'developer',
  BILLING: 'billing',
  MEMBER: 'member',
} as const

// Modules for permissions
export const MODULES = [
  { id: 'organizations', label: 'Organizations' },
  { id: 'members', label: 'Members' },
  { id: 'roles', label: 'Roles' },
  { id: 'invites', label: 'Invites' },
  { id: 'billing', label: 'Billing' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'settings', label: 'Settings' },
  { id: 'reports', label: 'Reports' },
  { id: 'skills', label: 'Skills' },
  { id: 'sections', label: 'Sections' },
  { id: 'departments', label: 'Departments' },
  { id: 'evaluations', label: 'Evaluations' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'question_papers', label: 'Question Papers' },
] as const

// Actions for permissions
export const ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'update', label: 'Update' },
  { id: 'delete', label: 'Delete' },
  { id: 'invite', label: 'Invite' },
  { id: 'manage', label: 'Manage' },
  { id: 'approve', label: 'Approve' },
  { id: 'reject', label: 'Reject' },
  { id: 'export', label: 'Export' },
] as const

// Industry options
export const INDUSTRIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
] as const

// Status badges colors
export const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  expired: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  success: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
} as const

// Plan badge colors
export const PLAN_COLORS = {
  free: 'bg-gray-100 text-gray-800',
  starter: 'bg-blue-100 text-blue-800',
  professional: 'bg-indigo-100 text-indigo-800',
  enterprise: 'bg-amber-100 text-amber-800',
} as const

export const PLAN_NAMES = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
} as const

// Prices in INR (paise = monthly * 100 for Razorpay)
export const PLAN_PRICING = {
  free:         { monthly: 0,    yearly: 0,      displayMonthly: '₹0',      displayYearly: '₹0' },
  starter:      { monthly: 2999, yearly: 29990,  displayMonthly: '₹2,999',  displayYearly: '₹29,990' },
  professional: { monthly: 7999, yearly: 79990,  displayMonthly: '₹7,999',  displayYearly: '₹79,990' },
  enterprise:   { monthly: 0,    yearly: 0,      displayMonthly: 'Custom',  displayYearly: 'Custom' },
} as const

export const PLAN_FEATURES = {
  free: {
    members: 5,
    projects: 3,
    storage: 5 * 1024,
    customRoles: false,
    advancedAnalytics: false,
    prioritySupport: false,
    sso: false,
    candidateInvites: 50,
    tenants: 1,
    highlight: false,
    cta: 'Start Free',
    points: [
      'Up to 1 tenant',
      '50 candidate invites/month',
      '5 team members',
      'Core dashboards',
    ],
  },
  starter: {
    members: 15,
    projects: 20,
    storage: 50 * 1024,
    customRoles: false,
    advancedAnalytics: false,
    prioritySupport: true,
    sso: false,
    candidateInvites: 300,
    tenants: 2,
    highlight: false,
    cta: 'Start Starter',
    points: [
      'Up to 2 tenants',
      '300 candidate invites/month',
      '15 team members',
      'Core dashboards + invites',
    ],
  },
  professional: {
    members: 50,
    projects: 100,
    storage: 250 * 1024,
    customRoles: true,
    advancedAnalytics: true,
    prioritySupport: true,
    sso: false,
    candidateInvites: 2000,
    tenants: 10,
    highlight: true,
    cta: 'Choose Professional',
    points: [
      'Up to 10 tenants',
      '2,000 candidate invites/month',
      '50 team members',
      'Advanced assessments + exports',
    ],
  },
  enterprise: {
    members: -1,
    projects: -1,
    storage: -1,
    customRoles: true,
    advancedAnalytics: true,
    prioritySupport: true,
    sso: true,
    candidateInvites: -1,
    tenants: -1,
    highlight: false,
    cta: 'Talk to Sales',
    points: [
      'Unlimited tenants',
      'Custom security controls',
      'Dedicated onboarding + SLA',
    ],
  },
} as const

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Date format
export const DATE_FORMAT = 'MMM d, yyyy'
export const DATETIME_FORMAT = 'MMM d, yyyy h:mm a'

// Invite expiry in days
export const INVITE_EXPIRY_DAYS = 7

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_USER: 'saas_rbac_user',
  AUTH_TOKEN: 'saas_rbac_token',
  THEME: 'saas_rbac_theme',
} as const
