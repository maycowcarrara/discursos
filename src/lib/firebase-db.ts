import { getFirestore } from 'firebase/firestore'

import { firebaseApp } from '@/lib/firebase-app'

export const firebaseDb = getFirestore(firebaseApp)
