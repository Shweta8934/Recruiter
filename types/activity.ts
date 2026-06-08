// Activity Log Types

export type ActivityType = 
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'organization_created'
  | 'organization_updated'
  | 'organization_deactivated'
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'permission_updated'
  | 'member_added'
  | 'member_removed'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_cancelled'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  | 'payment_success'
  | 'payment_failed'

export interface Activity {
  id: string
  type: ActivityType
  description: string
  userId: string
  userName: string
  organizationId?: string
  organizationName?: string
  metadata?: Record<string, unknown>
  createdAt: string
}
