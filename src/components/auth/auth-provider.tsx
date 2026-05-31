import { type PropsWithChildren, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'

import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from '@/components/auth/auth-context'
import { ensureAuthPersistence, firebaseAuth } from '@/lib/firebase'

function mapAuthUser(user: typeof firebaseAuth.currentUser): AuthUser | null {
  if (!user) {
    return null
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthContextValue>({
    status: 'loading',
    user: null,
  })

  useEffect(() => {
    let isMounted = true

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!isMounted) {
        return
      }

      setState({
        status: user ? 'authenticated' : 'unauthenticated',
        user: mapAuthUser(user),
      })
    })

    void ensureAuthPersistence().catch(() => {
      if (!isMounted) {
        return
      }

      setState({
        status: 'unauthenticated',
        user: null,
      })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
