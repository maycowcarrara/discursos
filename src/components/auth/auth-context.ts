import { createContext } from 'react'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthUser = {
  uid: string
  email: string | null
  displayName: string | null
}

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
