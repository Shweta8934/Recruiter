// Authentication Helper Functions
import type { User, LoginCredentials } from '@/types/auth'
import { users, getUserByEmail, getUserById } from '@/data/users'
import { getRoleById } from '@/data/roles'
import { getOrganizationById } from '@/data/organizations'
import { STORAGE_KEYS } from './constants'
import { getDashboardRoute } from './rbac'

// Validate login credentials
export function validateCredentials(credentials: LoginCredentials): User | null {
  const user = getUserByEmail(credentials.email)
  
  if (!user) return null
  if (user.password !== credentials.password) return null
  if (user.status === 'suspended') return null

  return user
}

// Get user with role and organization details
export interface UserWithDetails extends User {
  roleName: string
  roleSlug: string
  organizationName: string | null
}

export function getUserWithDetails(userId: string): UserWithDetails | null {
  const user = getUserById(userId)
  if (!user) return null

  const role = getRoleById(user.roleId)
  const org = user.organizationId ? getOrganizationById(user.organizationId) : null

  return {
    ...user,
    roleName: role?.name || 'Unknown',
    roleSlug: role?.slug || 'unknown',
    organizationName: org?.name || null,
  }
}

// Store user in local storage (client-side only)
export function storeUser(user: User): void {
  if (typeof window !== 'undefined') {
    // Don't store password
    const { password: _, ...safeUser } = user
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(safeUser))
  }
}

// Get stored user from local storage (client-side only)
export function getStoredUser(): Omit<User, 'password'> | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem(STORAGE_KEYS.AUTH_USER)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    document.cookie = `auth-token=${token}; path=/; max-age=86400; SameSite=Lax`
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
}

// Clear stored user
export function clearStoredUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
    })
  }
}

// Get redirect URL after login
export function getLoginRedirectUrl(user: User): string {
  return getDashboardRoute(user)
}

// Check if email is already registered
export function isEmailRegistered(email: string): boolean {
  return getUserByEmail(email) !== null
}

// Generate a simple user ID
export function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get all users for super admin
export function getAllUsers(): User[] {
  return users.map(u => ({ ...u, password: '***' }))
}
