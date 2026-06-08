// RBAC Helper Functions
import type { User } from '@/types/auth'
import type { Module, Action, Role, Permission, PermissionMatrix } from '@/types/rbac'
import { roles, getRoleById } from '@/data/roles'
import { permissions, getPermissionById } from '@/data/permissions'
import { ROLE_SLUGS, MODULES, ACTIONS } from './constants'
import { getDashboardRouteForRole } from './routes'

function getRoleContext(user: User | null) {
  if (!user) return null
  const roleSlug = (user as User & { roleSlug?: string | null }).roleSlug ?? null
  const rolePermissions = (user as User & { rolePermissions?: string[] }).rolePermissions ?? []
  return { roleSlug, rolePermissions }
}

function normalizePermissionCandidates(module: string, action: string) {
  const moduleAliases = module === 'organizations' ? ['organizations', 'org'] : [module]
  const candidates: string[] = []
  for (const m of moduleAliases) {
    candidates.push(`${m}-${action}`)
    candidates.push(`${m}:${action}`)
  }
  return candidates
}

// Check if user has a specific permission
export function hasPermission(
  user: User | null,
  module: Module,
  action: Action
): boolean {
  if (!user) return false

  const ctx = getRoleContext(user)
  const role = getRoleById(user.roleId)
  const roleSlug = ctx?.roleSlug ?? role?.slug
  const rolePermissions = ctx?.rolePermissions?.length ? ctx.rolePermissions : (role?.permissions ?? [])
  if (!roleSlug && rolePermissions.length === 0) return false

  // Super admin has all permissions
  if (roleSlug === ROLE_SLUGS.SUPER_ADMIN) return true
  // Org admin/HR/Recruiter have full organization-level permissions
  if (roleSlug === ROLE_SLUGS.ORG_ADMIN || roleSlug === ROLE_SLUGS.HR || roleSlug === ROLE_SLUGS.RECRUITER) return true

  const permissionCandidates = normalizePermissionCandidates(module, action)
  return permissionCandidates.some((p) => rolePermissions.includes(p))
}

// Check if user has any of the specified permissions
export function hasAnyPermission(
  user: User | null,
  requiredPermissions: { module: Module; action: Action }[]
): boolean {
  if (!user) return false
  return requiredPermissions.some(p => hasPermission(user, p.module, p.action))
}

// Check if user has all of the specified permissions
export function hasAllPermissions(
  user: User | null,
  requiredPermissions: { module: Module; action: Action }[]
): boolean {
  if (!user) return false
  return requiredPermissions.every(p => hasPermission(user, p.module, p.action))
}

// Check if user can access a specific route
export function canAccessRoute(user: User | null, route: string): boolean {
  if (!user) return false

  const role = getRoleById(user.roleId)
  const roleSlug = (user as User & { roleSlug?: string | null }).roleSlug ?? role?.slug
  if (!roleSlug) return false

  // Super admin can access everything
  if (roleSlug === ROLE_SLUGS.SUPER_ADMIN) return true

  // Check route-specific permissions would go here
  // For now, we just check if user is authenticated
  return true
}

// Get the appropriate dashboard route for a user
export function getDashboardRoute(user: User | null): string {
  if (!user) return '/login'

  const dbRoleSlug = (user as User & { roleSlug?: string | null }).roleSlug
  if (dbRoleSlug) return getDashboardRouteForRole(dbRoleSlug)

  const role = getRoleById(user.roleId)
  if (!role) return '/login'

  return getDashboardRouteForRole(role.slug)
}

// Get sidebar items based on user permissions
export interface SidebarItem {
  label: string
  href: string
  icon: string
  module?: Module
  action?: Action
}

export function getSidebarItems(user: User | null): SidebarItem[] {
  if (!user) return []

  const role = getRoleById(user.roleId)
  const roleSlug = (user as User & { roleSlug?: string | null }).roleSlug ?? role?.slug
  if (!roleSlug) return []

  const items: SidebarItem[] = []

  const dashboardHref = getDashboardRoute(user)

  // Dashboard - always shown
  items.push({
    label: 'Dashboard',
    href: dashboardHref,
    icon: 'LayoutDashboard',
  })

  // Super Admin specific items
  if (roleSlug === ROLE_SLUGS.SUPER_ADMIN) {
    items.push(
      { label: 'Organizations', href: '/organizations', icon: 'Building2', module: 'organizations', action: 'view' },
      // { label: 'Test Templates', href: '/super-admin/test-templates', icon: 'FilePlus', module: 'question_papers', action: 'view' },
      { label: 'All Members', href: '/members', icon: 'Users', module: 'members', action: 'view' },
      { label: 'All Roles', href: '/roles', icon: 'Shield', module: 'roles', action: 'view' },
      { label: 'Subscriptions', href: '/subscription', icon: 'CreditCard', module: 'subscription', action: 'view' },
      { label: 'Payments', href: '/payments', icon: 'Receipt', module: 'billing', action: 'view' },
      { label: 'Settings', href: '/settings', icon: 'Settings', module: 'settings', action: 'view' },
    )
    return items
  }

  // Organization-level items based on permissions
  if (hasPermission(user, 'members', 'view')) {
    items.push({ label: 'Members', href: '/members', icon: 'Users', module: 'members', action: 'view' })
  }

  if (hasPermission(user, 'roles', 'view')) {
    items.push({ label: 'Roles', href: '/roles', icon: 'Shield', module: 'roles', action: 'view' })
  }

  if (hasPermission(user, 'invites', 'view')) {
    items.push({ label: 'Invites', href: '/invites', icon: 'Mail', module: 'invites', action: 'view' })
  }

  if (hasPermission(user, 'jobs', 'view')) {
    items.push({ label: 'Projects', href: '/jobs', icon: 'Briefcase', module: 'jobs', action: 'view' })
  }

  // Keep existing /jobs (Projects) as-is, and add separate HR Job Posts module link.
  if ((roleSlug === ROLE_SLUGS.ORG_ADMIN || roleSlug === ROLE_SLUGS.HR || roleSlug === ROLE_SLUGS.RECRUITER) && hasPermission(user, 'jobs', 'view')) {
    items.push({ label: 'Job Posts', href: '/job-posts', icon: 'Briefcase', module: 'jobs', action: 'view' })
  }

  if (hasPermission(user, 'candidates', 'view')) {
    items.push({ label: 'Candidates', href: '/candidates', icon: 'UserCheck', module: 'candidates', action: 'view' })
  }

  if (hasPermission(user, 'interviews', 'view')) {
    items.push({ label: 'Interviews', href: '/interviews', icon: 'Calendar', module: 'interviews', action: 'view' })
  }

  if (hasPermission(user, 'skills', 'view')) {
    items.push({ label: 'Skills', href: '/skills', icon: 'Code', module: 'skills', action: 'view' })
  }

  if (hasPermission(user, 'sections', 'view')) {
    items.push({ label: 'Sections', href: '/sections', icon: 'Layout', module: 'sections', action: 'view' })
  }

  if (hasPermission(user, 'departments', 'view')) {
    items.push({ label: 'Departments', href: '/departments', icon: 'Building', module: 'departments', action: 'view' })
  }

  if (hasPermission(user, 'evaluations', 'view')) {
    items.push({ label: 'Evaluation Templates', href: '/evaluations', icon: 'ClipboardList', module: 'evaluations', action: 'view' })
  }

  if (hasPermission(user, 'rounds', 'view')) {
    items.push({ label: 'Round Master', href: '/rounds', icon: 'Workflow', module: 'rounds', action: 'view' })
  }

  if (hasPermission(user, 'question_papers', 'view')) {
    items.push({ label: 'Question Papers', href: '/question-papers', icon: 'FileText', module: 'question_papers', action: 'view' })
    // items.push({ label: 'Test Templates', href: '/test-templates', icon: 'FilePlus', module: 'question_papers', action: 'view' })
  }

  // Question Library – only for roles that can create/manage assessment content
  if (hasPermission(user, 'question_papers', 'create')) {
    items.push({ label: 'Question Library', href: '/question-library', icon: 'BookOpen', module: 'question_papers', action: 'create' })
  }

  if (hasPermission(user, 'billing', 'view') && dashboardHref !== '/billing/dashboard') {
    items.push({ label: 'Billing', href: '/billing/dashboard', icon: 'CreditCard', module: 'billing', action: 'view' })
  }

  if (hasPermission(user, 'subscription', 'view')) {
    items.push({ label: 'Subscription', href: '/subscription', icon: 'Sparkles', module: 'subscription', action: 'view' })
  }

  // if (hasPermission(user, 'reports', 'view')) {
  //   items.push({ label: 'Reports', href: '/reports', icon: 'BarChart3', module: 'reports', action: 'view' })
  // }

  if (hasPermission(user, 'settings', 'view')) {
    items.push({ label: 'Settings', href: '/settings', icon: 'Settings', module: 'settings', action: 'view' })
  }

  return items
}

// Check if user can manage an organization
export function canManageOrganization(user: User | null, organizationId: string): boolean {
  if (!user) return false

  const role = getRoleById(user.roleId)
  const roleSlug = (user as User & { roleSlug?: string | null }).roleSlug ?? role?.slug
  if (!roleSlug) return false

  // Super admin can manage any organization
  if (roleSlug === ROLE_SLUGS.SUPER_ADMIN) return true

  // Org admin can only manage their own organization
  if (roleSlug === ROLE_SLUGS.ORG_ADMIN && user.organizationId === organizationId) {
    return true
  }

  return false
}

// Check if user is a super admin
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false
  const dbRoleSlug = (user as User & { roleSlug?: string | null }).roleSlug
  if (dbRoleSlug) return dbRoleSlug === ROLE_SLUGS.SUPER_ADMIN
  const role = getRoleById(user.roleId)
  return role?.slug === ROLE_SLUGS.SUPER_ADMIN
}

// Check if user is an organization admin
export function isOrgAdmin(user: User | null): boolean {
  if (!user) return false
  const dbRoleSlug = (user as User & { roleSlug?: string | null }).roleSlug
  if (dbRoleSlug) return dbRoleSlug === ROLE_SLUGS.ORG_ADMIN
  const role = getRoleById(user.roleId)
  return role?.slug === ROLE_SLUGS.ORG_ADMIN
}

// Get role details with permissions
export function getRoleWithPermissions(roleId: string): Role & { permissionDetails: Permission[] } | null {
  const role = getRoleById(roleId)
  if (!role) return null

  const permissionDetails = role.permissions
    .map(id => getPermissionById(id))
    .filter((p): p is Permission => p !== undefined)

  return { ...role, permissionDetails }
}

// Build permission matrix for a role
export function buildPermissionMatrix(roleId: string): PermissionMatrix[] {
  const role = getRoleById(roleId)
  if (!role) return []

  return MODULES.map(mod => ({
    module: mod.id as Module,
    label: mod.label,
    actions: ACTIONS.map(act => {
      const permissionId = `${mod.id}-${act.id}`
      const permission = permissions.find(p => p.id === permissionId)
      return {
        action: act.id as Action,
        permissionId,
        granted: role.permissions.includes(permissionId),
      }
    }),
  }))
}

// Get all available roles for an organization
export function getAvailableRoles(organizationId: string | null): Role[] {
  if (!organizationId) {
    // Return system roles for super admin context
    return roles.filter(r => r.isSystem && r.organizationId === null)
  }
  // Return roles for the organization plus organization-specific custom roles
  return roles.filter(r => 
    (r.isSystem && r.organizationId !== null) || 
    r.organizationId === organizationId
  )
}
