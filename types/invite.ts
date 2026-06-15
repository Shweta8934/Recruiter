// Invite Types

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface Invite {
  id: string
  email: string
  organizationId: string
  roleId: string
  token: string
  status: InviteStatus
  invitedBy: string // User ID
  message?: string
  expiresAt: string
  acceptedAt?: string
  createdAt: string
}

export interface InviteWithDetails extends Invite {
  organizationName: string
  roleName: string
  inviterName: string
}

export interface CreateInviteData {
  email: string
  organizationId: string
  roleId: string
  message?: string
}

export interface AcceptInviteData {
  token: string
  name: string
  password: string
}
