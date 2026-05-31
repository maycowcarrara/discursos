import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'

import {
  ensureAuthPersistence,
  firebaseAuth,
  googleProvider,
} from '@/lib/firebase'

export type LoginCredentials = {
  email: string
  password: string
}

export async function loginWithEmail({
  email,
  password,
}: LoginCredentials) {
  await ensureAuthPersistence()

  return signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
}

export async function loginWithGoogle() {
  await ensureAuthPersistence()

  return signInWithPopup(firebaseAuth, googleProvider)
}

export async function logout() {
  return signOut(firebaseAuth)
}
