import {
  getDoc,
  getDocs,
  type DocumentData,
  type DocumentReference,
  type Query,
} from 'firebase/firestore'
import type { ZodType } from 'zod'

import type { FirestoreRecord } from '@/types/firestore'

export async function getTypedDocument<T>(
  documentRef: DocumentReference<DocumentData>,
  schema: ZodType<T>,
): Promise<FirestoreRecord<T> | null> {
  const snapshot = await getDoc(documentRef)

  if (!snapshot.exists()) {
    return null
  }

  const parsed = schema.parse(snapshot.data())

  return {
    id: snapshot.id,
    ...parsed,
  }
}

export async function getTypedCollection<T>(
  queryRef: Query<DocumentData>,
  schema: ZodType<T>,
): Promise<Array<FirestoreRecord<T>>> {
  const snapshot = await getDocs(queryRef)

  return snapshot.docs.map((documentSnapshot) => {
    const parsed = schema.parse(documentSnapshot.data())

    return {
      id: documentSnapshot.id,
      ...parsed,
    }
  })
}
