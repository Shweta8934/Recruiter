// Dummy Activity Logs Data
import type { Activity } from '@/types/activity'

export const activities: Activity[] = [
  {
    id: 'activity-1',
    type: 'user_login',
    description: 'User logged in',
    userId: 'user-1',
    userName: 'Super Admin',
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'activity-2',
    type: 'organization_created',
    description: 'Created organization RetailMax Store',
    userId: 'user-1',
    userName: 'Super Admin',
    organizationId: 'org-5',
    organizationName: 'RetailMax Store',
    createdAt: '2024-04-12T00:00:00Z',
  },
  {
    id: 'activity-3',
    type: 'member_added',
    description: 'Added new member Alex Turner',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    metadata: { memberId: 'user-12', memberName: 'Alex Turner' },
    createdAt: '2024-04-10T00:00:00Z',
  },
  {
    id: 'activity-4',
    type: 'role_created',
    description: 'Created custom role Senior Recruiter',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    metadata: { roleId: 'role-custom-1', roleName: 'Senior Recruiter' },
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'activity-5',
    type: 'invite_sent',
    description: 'Sent invite to newdev@techcorp.com',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    metadata: { email: 'newdev@techcorp.com', roleId: 'role-developer' },
    createdAt: '2024-05-20T10:00:00Z',
  },
  {
    id: 'activity-6',
    type: 'subscription_upgraded',
    description: 'Upgraded subscription from Starter to Professional',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    metadata: { fromPlan: 'plan-starter', toPlan: 'plan-professional' },
    createdAt: '2024-04-01T10:00:00Z',
  },
  {
    id: 'activity-7',
    type: 'payment_success',
    description: 'Payment successful for Professional Plan',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    metadata: { amount: 79, planId: 'plan-professional' },
    createdAt: '2024-05-01T10:00:00Z',
  },
  {
    id: 'activity-8',
    type: 'invite_accepted',
    description: 'marketing@techcorp.com accepted invite',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    metadata: { email: 'marketing@techcorp.com' },
    createdAt: '2024-05-18T09:00:00Z',
  },
  {
    id: 'activity-9',
    type: 'permission_updated',
    description: 'Updated permissions for HR role',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    metadata: { roleId: 'role-hr' },
    createdAt: '2024-03-20T14:00:00Z',
  },
  {
    id: 'activity-10',
    type: 'user_login',
    description: 'User logged in',
    userId: 'user-2',
    userName: 'John Smith',
    organizationId: 'org-1',
    organizationName: 'TechCorp Inc.',
    createdAt: '2024-06-01T09:30:00Z',
  },
]

export function getActivityById(id: string): Activity | undefined {
  return activities.find(a => a.id === id)
}

export function getActivitiesByOrganization(orgId: string): Activity[] {
  return activities.filter(a => a.organizationId === orgId)
}

export function getActivitiesByUser(userId: string): Activity[] {
  return activities.filter(a => a.userId === userId)
}

export function getRecentActivities(limit: number = 10): Activity[] {
  return [...activities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}
