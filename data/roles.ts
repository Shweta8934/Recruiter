// Dummy Roles Data
import type { Role } from '@/types/rbac'

// System role IDs (used across organizations)
export const ROLE_SUPER_ADMIN = 'role-super-admin'
export const ROLE_ORG_ADMIN = 'role-org-admin'
export const ROLE_HR = 'role-hr'
export const ROLE_RECRUITER = 'role-recruiter'
export const ROLE_DEVELOPER = 'role-developer'
export const ROLE_BILLING = 'role-billing'
export const ROLE_MEMBER = 'role-member'

export const roles: Role[] = [
  {
    id: ROLE_SUPER_ADMIN,
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Full system access across all organizations',
    organizationId: null,
    isSystem: true,
    permissions: [
      'org-view', 'org-create', 'org-update', 'org-delete', 'org-manage',
      'members-view', 'members-create', 'members-update', 'members-delete', 'members-invite',
      'roles-view', 'roles-create', 'roles-update', 'roles-delete', 'roles-manage',
      'invites-view', 'invites-create', 'invites-delete',
      'billing-view', 'billing-manage', 'billing-export',
      'subscription-view', 'subscription-manage',
      'dashboard-view',
      'jobs-view', 'jobs-create', 'jobs-update', 'jobs-delete', 'jobs-manage',
      'candidates-view', 'candidates-create', 'candidates-update', 'candidates-delete', 'candidates-approve', 'candidates-reject',
      'interviews-view', 'interviews-create', 'interviews-update', 'interviews-delete',
      'settings-view', 'settings-update',
      'reports-view', 'reports-export',
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: ROLE_ORG_ADMIN,
    name: 'Organization Admin',
    slug: 'org-admin',
    description: 'Full access within organization',
    organizationId: 'org-1',
    isSystem: true,
    permissions: [
      'org-view', 'org-update',
      'members-view', 'members-create', 'members-update', 'members-delete', 'members-invite',
      'roles-view', 'roles-create', 'roles-update', 'roles-delete', 'roles-manage',
      'invites-view', 'invites-create', 'invites-delete',
      'billing-view', 'billing-manage', 'billing-export',
      'subscription-view', 'subscription-manage',
      'dashboard-view',
      'jobs-view', 'jobs-create', 'jobs-update', 'jobs-delete', 'jobs-manage',
      'candidates-view', 'candidates-create', 'candidates-update', 'candidates-delete', 'candidates-approve', 'candidates-reject',
      'interviews-view', 'interviews-create', 'interviews-update', 'interviews-delete',
      'settings-view', 'settings-update',
      'reports-view', 'reports-export',
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: ROLE_HR,
    name: 'HR',
    slug: 'hr',
    description: 'Human resources management',
    organizationId: 'org-1',
    isSystem: true,
    permissions: [
      'org-view',
      'members-view', 'members-update', 'members-delete',
      'roles-view',
      'invites-view', 'invites-create',
      'dashboard-view',
      'jobs-view', 'jobs-create', 'jobs-update',
      'candidates-view', 'candidates-create', 'candidates-update', 'candidates-approve', 'candidates-reject',
      'interviews-view', 'interviews-create', 'interviews-update', 'interviews-delete',
      'reports-view',
      'skills-view', 'skills-create', 'skills-update', 'skills-delete',
      'sections-view', 'sections-create', 'sections-update', 'sections-delete',
      'departments-view', 'departments-create', 'departments-update', 'departments-delete',
      'evaluations-view', 'evaluations-create', 'evaluations-update', 'evaluations-delete',
      'rounds-view', 'rounds-create', 'rounds-update', 'rounds-delete',
      'question_papers-view', 'question_papers-create', 'question_papers-update', 'question_papers-delete',
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: ROLE_RECRUITER,
    name: 'Recruiter',
    slug: 'recruiter',
    description: 'Recruitment and candidate management',
    organizationId: 'org-1',
    isSystem: true,
    permissions: [
      'org-view',
      'members-view',
      'dashboard-view',
      'jobs-view', 'jobs-create', 'jobs-update',
      'candidates-view', 'candidates-create', 'candidates-update',
      'interviews-view', 'interviews-create',
      'skills-view', 'skills-create', 'skills-update', 'skills-delete',
      'sections-view', 'sections-create', 'sections-update', 'sections-delete',
      'departments-view', 'departments-create', 'departments-update', 'departments-delete',
      'evaluations-view', 'evaluations-create', 'evaluations-update', 'evaluations-delete',
      'rounds-view', 'rounds-create', 'rounds-update', 'rounds-delete',
      'question_papers-view', 'question_papers-create', 'question_papers-update', 'question_papers-delete',
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: ROLE_DEVELOPER,
    name: 'Developer',
    slug: 'developer',
    description: 'Development team member',
    organizationId: 'org-1',
    isSystem: true,
    permissions: [
      'org-view',
      'members-view',
      'dashboard-view',
      'interviews-view',
      'settings-view',
      'skills-view', 'skills-create', 'skills-update', 'skills-delete',
      'sections-view', 'sections-create', 'sections-update', 'sections-delete',
      'departments-view', 'departments-create', 'departments-update', 'departments-delete',
      'evaluations-view', 'evaluations-create', 'evaluations-update', 'evaluations-delete',
      'rounds-view', 'rounds-create', 'rounds-update', 'rounds-delete',
      'question_papers-view', 'question_papers-create', 'question_papers-update', 'question_papers-delete',
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: ROLE_BILLING,
    name: 'Billing Manager',
    slug: 'billing',
    description: 'Billing and subscription management',
    organizationId: 'org-1',
    isSystem: true,
    permissions: [
      'org-view',
      'billing-view', 'billing-manage', 'billing-export',
      'subscription-view', 'subscription-manage',
      'dashboard-view',
      'reports-view', 'reports-export',
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: ROLE_MEMBER,
    name: 'Member',
    slug: 'member',
    description: 'Basic team member',
    organizationId: 'org-1',
    isSystem: true,
    permissions: [
      'org-view',
      'members-view',
      'dashboard-view',
      'settings-view',
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  // Custom role example
  {
    id: 'role-custom-1',
    name: 'Senior Recruiter',
    slug: 'senior-recruiter',
    description: 'Senior recruiter with additional permissions',
    organizationId: 'org-1',
    isSystem: false,
    permissions: [
      'org-view',
      'members-view', 'members-invite',
      'dashboard-view',
      'jobs-view', 'jobs-create', 'jobs-update', 'jobs-delete',
      'candidates-view', 'candidates-create', 'candidates-update', 'candidates-approve', 'candidates-reject',
      'interviews-view', 'interviews-create', 'interviews-update', 'interviews-delete',
      'reports-view',
    ],
    createdAt: '2024-02-15T00:00:00Z',
  },
]

export function getRoleById(id: string): Role | undefined {
  return roles.find(r => r.id === id)
}

export function getRolesByOrganization(orgId: string | null): Role[] {
  return roles.filter(r => r.organizationId === orgId || r.organizationId === null)
}

export function getSystemRoles(): Role[] {
  return roles.filter(r => r.isSystem)
}
