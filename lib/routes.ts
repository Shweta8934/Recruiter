// Route definitions and dashboard mappings
import { ROLE_SLUGS } from './constants'

export interface RouteConfig {
  path: string
  label: string
  requiredPermissions?: { module: string; action: string }[]
  requiredRoles?: string[]
  requiresAuth: boolean
  requiresSubscription?: boolean
}

// Dashboard routes mapped to role slugs
export const DASHBOARD_ROUTES: Record<string, string> = {
  [ROLE_SLUGS.SUPER_ADMIN]: '/super-admin/dashboard',
  [ROLE_SLUGS.ORG_ADMIN]: '/organization/dashboard',
  [ROLE_SLUGS.HR]: '/hr/dashboard',
  [ROLE_SLUGS.RECRUITER]: '/recruiter/dashboard',
  [ROLE_SLUGS.DEVELOPER]: '/developer/dashboard',
  [ROLE_SLUGS.BILLING]: '/billing/dashboard',
  [ROLE_SLUGS.MEMBER]: '/member/dashboard',
}

// Public routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/accept-invite',
  '/question-papers/take',
  '/careers',
]

// Routes that require specific permissions
export const PROTECTED_ROUTES: RouteConfig[] = [
  // Super Admin routes
  {
    path: '/super-admin',
    label: 'Super Admin',
    requiredRoles: [ROLE_SLUGS.SUPER_ADMIN],
    requiresAuth: true,
  },
  // Organization management
  {
    path: '/organizations',
    label: 'Organizations',
    requiredPermissions: [{ module: 'organizations', action: 'view' }],
    requiresAuth: true,
  },
  // Members management
  {
    path: '/members',
    label: 'Members',
    requiredPermissions: [{ module: 'members', action: 'view' }],
    requiresAuth: true,
  },
  // Roles management
  {
    path: '/roles',
    label: 'Roles',
    requiredPermissions: [{ module: 'roles', action: 'view' }],
    requiresAuth: true,
  },
  // Invites management
  {
    path: '/invites',
    label: 'Invites',
    requiredPermissions: [{ module: 'invites', action: 'view' }],
    requiresAuth: true,
  },
  // Billing
  {
    path: '/billing',
    label: 'Billing',
    requiredPermissions: [{ module: 'billing', action: 'view' }],
    requiresAuth: true,
    requiresSubscription: true,
  },
  // Subscription
  {
    path: '/subscription',
    label: 'Subscription',
    requiredPermissions: [{ module: 'subscription', action: 'view' }],
    requiresAuth: true,
  },
  // Settings
  {
    path: '/settings',
    label: 'Settings',
    requiredPermissions: [{ module: 'settings', action: 'view' }],
    requiresAuth: true,
  },
  // Reports
  {
    path: '/reports',
    label: 'Reports',
    requiredPermissions: [{ module: 'reports', action: 'view' }],
    requiresAuth: true,
    requiresSubscription: true,
  },
  // Question Papers
  {
    path: '/question-papers',
    label: 'Question Papers',
    requiredPermissions: [{ module: 'question_papers', action: 'view' }],
    requiresAuth: true,
  },
]

// Get dashboard route for a role slug
export function getDashboardRouteForRole(roleSlug: string): string {
  return DASHBOARD_ROUTES[roleSlug] || '/member/dashboard'
}

// Check if a route is public
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    path === route || path.startsWith(`${route}/`)
  )
}

// Get route config for a path
export function getRouteConfig(path: string): RouteConfig | undefined {
  return PROTECTED_ROUTES.find(route =>
    path === route.path || path.startsWith(`${route.path}/`)
  )
}
