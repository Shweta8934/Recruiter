// Organization Types

export type OrganizationStatus = 'active' | 'inactive' | 'suspended'

export type Industry = 
  | 'technology'
  | 'healthcare'
  | 'finance'
  | 'education'
  | 'retail'
  | 'manufacturing'
  | 'consulting'
  | 'other'

export interface Organization {
  id: string
  name: string
  slug: string
  email: string
  industry: Industry
  status: OrganizationStatus
  createdAt: string
  subscriptionPlanId: string
  ownerId: string
  logo?: string
  description?: string
}

export interface OrganizationWithStats extends Organization {
  membersCount: number
  rolesCount: number
  pendingInvitesCount: number
}
