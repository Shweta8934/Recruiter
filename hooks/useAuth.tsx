'use client'

import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/store/rootReducer'
import { loginRequest, logout as logoutAction, setUser as setReduxUser, authActions } from '@/store/slices/authSlice'
import type { User, AuthContextType, LoginCredentials, SignupData } from '@/types/auth'
import { storeUser, clearStoredUser, getStoredUser } from '@/lib/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch()
  const { user, isLoading, error } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    const stored = getStoredUser()
    dispatch(setReduxUser(stored as User | null))
    if (stored) {
      dispatch(authActions.appInitRequest({ user: stored as User }))
    }
  }, [dispatch])

  const login = useCallback((credentials: LoginCredentials) => {
    dispatch(loginRequest(credentials))
  }, [dispatch])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      // sendBeacon ensures the logout request completes even during page navigation
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/ai-recruitment-platform';
      navigator.sendBeacon(`${basePath}/api/auth/logout`)
    }
    dispatch(logoutAction())
    clearStoredUser()
  }, [dispatch])

  const signup = useCallback(async (_data: SignupData): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Signup is not enabled yet. Ask admin to create user.' }
  }, [])

  const updateUser = useCallback((data: Partial<User>) => {
    if (!user) return
    const updated = { ...user, ...data }
    storeUser(updated)
    dispatch(setReduxUser(updated))
  }, [user, dispatch])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, error, login, logout, signup, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
