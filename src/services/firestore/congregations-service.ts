import { collection, orderBy, query, where } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  congregationSchema,
  type CongregationDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export async function listCongregations(): Promise<
  Array<FirestoreRecord<CongregationDocument>>
> {
  const congregationsQuery = query(
    collection(firebaseDb, 'congregations'),
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  )

  return getTypedCollection(congregationsQuery, congregationSchema)
}
