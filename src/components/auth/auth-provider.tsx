import { type PropsWithChildren, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'

import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from '@/components/auth/auth-context'
import { ensureAuthPersistence, firebaseAuth } from '@/lib/firebase-auth'
import { reconcileAdminAccess } from '@/services/auth/admin-access-service'
import { hasAdminAccess } from '@/services/auth/auth-service'

function mapAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    isAdmin: true,
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
      void (async () => {
        if (!isMounted) {
          return
        }

        if (!user) {
          setState({
            status: 'unauthenticated',
            user: null,
          })
          return
        }

        setState({
          status: 'loading',
          user: null,
        })

        try {
          await reconcileAdminAccess(user)

          if (!(await hasAdminAccess(user))) {
            await signOut(firebaseAuth).catch(() => undefined)

            if (isMounted) {
              setState({
                status: 'unauthenticated',
                user: null,
              })
            }

            return
          }

          if (isMounted) {
            setState({
              status: 'authenticated',
              user: mapAuthUser(user),
            })
          }
        } catch {
          await signOut(firebaseAuth).catch(() => undefined)

          if (isMounted) {
            setState({
              status: 'unauthenticated',
              user: null,
            })
          }
        }
      })()
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
