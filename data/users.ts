// Dummy Users Data
import type { User } from '@/types/auth'
import { 
  ROLE_SUPER_ADMIN, 
  ROLE_ORG_ADMIN, 
  ROLE_HR, 
  ROLE_RECRUITER, 
  ROLE_DEVELOPER, 
  ROLE_BILLING, 
  ROLE_MEMBER 
} from './roles'

export const users: User[] = [
  // Super Admin (no organization)
  {
    id: 'user-1',
    name: 'Super Admin',
    email: 'superadmin@example.com',
    password: 'password123',
    organizationId: null,
    roleId: ROLE_SUPER_ADMIN,
    status: 'active',
    joinedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-06-01T10:00:00Z',
  },
  // Organization Admin - TechCorp
  {
    id: 'user-2',
    name: 'John Smith',
    email: 'orgadmin@example.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_ORG_ADMIN,
    status: 'active',
    joinedAt: '2024-01-15T00:00:00Z',
    lastLoginAt: '2024-06-01T09:30:00Z',
  },
  // HR - TechCorp
  {
    id: 'user-3',
    name: 'Sarah Johnson',
    email: 'hr@example.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_HR,
    status: 'active',
    joinedAt: '2024-02-01T00:00:00Z',
    lastLoginAt: '2024-05-30T14:00:00Z',
  },
  // Recruiter - TechCorp
  {
    id: 'user-4',
    name: 'Mike Davis',
    email: 'recruiter@example.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_RECRUITER,
    status: 'active',
    joinedAt: '2024-02-15T00:00:00Z',
    lastLoginAt: '2024-05-29T11:00:00Z',
  },
  // Developer - TechCorp
  {
    id: 'user-5',
    name: 'Emily Chen',
    email: 'developer@example.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_DEVELOPER,
    status: 'active',
    joinedAt: '2024-03-01T00:00:00Z',
    lastLoginAt: '2024-05-28T16:30:00Z',
  },
  // Billing Manager - TechCorp
  {
    id: 'user-6',
    name: 'Robert Wilson',
    email: 'billing@example.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_BILLING,
    status: 'active',
    joinedAt: '2024-03-15T00:00:00Z',
    lastLoginAt: '2024-05-27T13:00:00Z',
  },
  // Member - TechCorp
  {
    id: 'user-7',
    name: 'Lisa Brown',
    email: 'member@example.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_MEMBER,
    status: 'active',
    joinedAt: '2024-04-01T00:00:00Z',
    lastLoginAt: '2024-05-26T10:00:00Z',
  },
  // Additional members for org-1
  {
    id: 'user-12',
    name: 'Alex Turner',
    email: 'alex.turner@techcorp.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_DEVELOPER,
    status: 'active',
    joinedAt: '2024-04-10T00:00:00Z',
    lastLoginAt: '2024-05-25T09:00:00Z',
  },
  {
    id: 'user-13',
    name: 'Jessica Miller',
    email: 'jessica.miller@techcorp.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: 'role-custom-1', // Senior Recruiter
    status: 'active',
    joinedAt: '2024-04-15T00:00:00Z',
    lastLoginAt: '2024-05-24T14:30:00Z',
  },
  {
    id: 'user-14',
    name: 'David Lee',
    email: 'david.lee@techcorp.com',
    password: 'password123',
    organizationId: 'org-1',
    roleId: ROLE_MEMBER,
    status: 'pending',
    joinedAt: '2024-05-01T00:00:00Z',
  },
  // HealthFirst org admin
  {
    id: 'user-8',
    name: 'Dr. Amanda White',
    email: 'amanda@healthfirst.com',
    password: 'password123',
    organizationId: 'org-2',
    roleId: ROLE_ORG_ADMIN,
    status: 'active',
    joinedAt: '2024-02-10T00:00:00Z',
    lastLoginAt: '2024-05-20T08:00:00Z',
  },
  // EduLearn org admin
  {
    id: 'user-9',
    name: 'Prof. James Taylor',
    email: 'james@edulearn.com',
    password: 'password123',
    organizationId: 'org-3',
    roleId: ROLE_ORG_ADMIN,
    status: 'active',
    joinedAt: '2024-03-05T00:00:00Z',
    lastLoginAt: '2024-05-18T12:00:00Z',
  },
  // FinanceHub org admin
  {
    id: 'user-10',
    name: 'Karen Black',
    email: 'karen@financehub.com',
    password: 'password123',
    organizationId: 'org-4',
    roleId: ROLE_ORG_ADMIN,
    status: 'active',
    joinedAt: '2024-01-20T00:00:00Z',
    lastLoginAt: '2024-04-15T09:00:00Z',
  },
  // RetailMax org admin
  {
    id: 'user-11',
    name: 'Tom Green',
    email: 'tom@retailmax.com',
    password: 'password123',
    organizationId: 'org-5',
    roleId: ROLE_ORG_ADMIN,
    status: 'active',
    joinedAt: '2024-04-12T00:00:00Z',
    lastLoginAt: '2024-05-22T15:00:00Z',
  },
]

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase())
}

export function getUsersByOrganization(orgId: string): User[] {
  return users.filter(u => u.organizationId === orgId)
}

export function getActiveUsers(): User[] {
  return users.filter(u => u.status === 'active')
}
