// Authentication Types

export type UserStatus = 'active' | 'pending' | 'suspended'

export interface User {
  id: string
  name: string
  email: string
  password?: string
  organizationId: string | null
  organizationSlug?: string | null
  roleId: string
  roleSlug?: string | null
  rolePermissions?: string[]
  status: UserStatus
  avatar?: string
  joinedAt: string
  lastLoginAt?: string
  memberships?: {
    organizationId: string
    organizationSlug?: string
    organizationName: string
    organizationLogo?: string | null
    role: string
    status: UserStatus
  }[]
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  name: string
  email: string
  password: string
  organizationName?: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error?: string | null
  login: (credentials: LoginCredentials) => void
  logout: () => void
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>
  updateUser: (data: Partial<User>) => void
}
