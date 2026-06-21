import {
  type User,
  signInWithPopup,
  signOut,
} from 'firebase/auth'

import {
  ensureAuthPersistence,
  firebaseAuth,
  googleProvider,
} from '@/lib/firebase-auth'
import {
  AdminAccessRequiredError,
  reconcileAdminAccess,
} from '@/services/auth/admin-access-service'

export async function hasAdminAccess(user: User) {
  const tokenResult = await user.getIdTokenResult()

  return tokenResult.claims.admin === true
}

async function assertAdminAccess(user: User) {
  if (await hasAdminAccess(user)) {
    return
  }

  await signOut(firebaseAuth).catch(() => undefined)

  throw new AdminAccessRequiredError(
    'A conta autenticada não possui acesso administrativo.',
  )
}

export async function loginWithGoogle() {
  await ensureAuthPersistence()

  const credential = await signInWithPopup(firebaseAuth, googleProvider)

  await reconcileAdminAccess(credential.user)
  await assertAdminAccess(credential.user)

  return credential
}

export async function logout() {
  return signOut(firebaseAuth)
}
