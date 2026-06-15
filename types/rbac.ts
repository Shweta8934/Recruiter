// RBAC Types - Roles, Permissions, Grants

export type Module = 
  | 'organizations'
  | 'members'
  | 'roles'
  | 'invites'
  | 'billing'
  | 'subscription'
  | 'dashboard'
  | 'jobs'
  | 'candidates'
  | 'interviews'
  | 'settings'
  | 'reports'
  | 'evaluations'
  | 'rounds'
  | 'question_papers'

export type Action = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'invite'
  | 'manage'
  | 'approve'
  | 'reject'
  | 'export'

export interface Permission {
  id: string
  module: Module
  action: Action
  label: string
  description: string
}

export interface Role {
  id: string
  name: string
  slug: string
  description: string
  organizationId: string | null // null for system roles like Super Admin
  isSystem: boolean // System roles cannot be deleted
  permissions: string[] // Permission IDs
  createdAt: string
}

export interface RoleWithPermissions extends Role {
  permissionDetails: Permission[]
}

// Permission matrix type for UI
export interface PermissionMatrix {
  module: Module
  label: string
  actions: {
    action: Action
    permissionId: string
    granted: boolean
  }[]
}

// Route permission mapping
export interface RoutePermission {
  path: string
  requiredPermissions: { module: Module; action: Action }[]
  requiresAuth: boolean
  requiresSubscription?: boolean
}
