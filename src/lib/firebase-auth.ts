import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth'

import { firebaseApp } from '@/lib/firebase-app'

export const firebaseAuth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()

let persistencePromise: Promise<void> | null = null

export function ensureAuthPersistence() {
  if (!persistencePromise) {
    persistencePromise = setPersistence(firebaseAuth, browserLocalPersistence)
  }

  return persistencePromise
}
