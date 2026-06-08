// Dummy Invites Data
import type { Invite } from '@/types/invite'

export const invites: Invite[] = [
  {
    id: 'invite-1',
    email: 'newdev@techcorp.com',
    organizationId: 'org-1',
    roleId: 'role-developer',
    token: 'invite-token-abc123',
    status: 'pending',
    invitedBy: 'user-2',
    message: 'Welcome to the team! We are excited to have you join us.',
    expiresAt: '2024-06-15T00:00:00Z',
    createdAt: '2024-05-20T10:00:00Z',
  },
  {
    id: 'invite-2',
    email: 'hr.assistant@techcorp.com',
    organizationId: 'org-1',
    roleId: 'role-hr',
    token: 'invite-token-def456',
    status: 'pending',
    invitedBy: 'user-3',
    expiresAt: '2024-06-10T00:00:00Z',
    createdAt: '2024-05-15T14:30:00Z',
  },
  {
    id: 'invite-3',
    email: 'marketing@techcorp.com',
    organizationId: 'org-1',
    roleId: 'role-member',
    token: 'invite-token-ghi789',
    status: 'accepted',
    invitedBy: 'user-2',
    acceptedAt: '2024-05-18T09:00:00Z',
    expiresAt: '2024-05-25T00:00:00Z',
    createdAt: '2024-05-12T11:00:00Z',
  },
  {
    id: 'invite-4',
    email: 'expired@techcorp.com',
    organizationId: 'org-1',
    roleId: 'role-member',
    token: 'invite-token-jkl012',
    status: 'expired',
    invitedBy: 'user-2',
    expiresAt: '2024-04-01T00:00:00Z',
    createdAt: '2024-03-15T08:00:00Z',
  },
  {
    id: 'invite-5',
    email: 'cancelled@techcorp.com',
    organizationId: 'org-1',
    roleId: 'role-recruiter',
    token: 'invite-token-mno345',
    status: 'cancelled',
    invitedBy: 'user-2',
    expiresAt: '2024-05-30T00:00:00Z',
    createdAt: '2024-05-01T16:00:00Z',
  },
  // Invites for other organizations
  {
    id: 'invite-6',
    email: 'nurse@healthfirst.com',
    organizationId: 'org-2',
    roleId: 'role-member',
    token: 'invite-token-pqr678',
    status: 'pending',
    invitedBy: 'user-8',
    expiresAt: '2024-06-20T00:00:00Z',
    createdAt: '2024-05-22T10:00:00Z',
  },
]

export function getInviteById(id: string): Invite | undefined {
  return invites.find(i => i.id === id)
}

export function getInviteByToken(token: string): Invite | undefined {
  return invites.find(i => i.token === token)
}

export function getInvitesByOrganization(orgId: string): Invite[] {
  return invites.filter(i => i.organizationId === orgId)
}

export function getPendingInvitesByOrganization(orgId: string): Invite[] {
  return invites.filter(i => i.organizationId === orgId && i.status === 'pending')
}
