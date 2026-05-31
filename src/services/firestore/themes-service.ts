import { collection, orderBy, query, where } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  themeSchema,
  type FirestoreRecord,
  type ThemeDocument,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export async function listThemes(): Promise<Array<FirestoreRecord<ThemeDocument>>> {
  const themesQuery = query(
    collection(firebaseDb, 'themes'),
    where('isActive', '==', true),
    orderBy('number', 'asc'),
  )

  return getTypedCollection(themesQuery, themeSchema)
}
