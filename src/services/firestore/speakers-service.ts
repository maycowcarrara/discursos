import { collection, orderBy, query, where } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  speakerSchema,
  type FirestoreRecord,
  type SpeakerDocument,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export async function listSpeakers(): Promise<
  Array<FirestoreRecord<SpeakerDocument>>
> {
  const speakersQuery = query(
    collection(firebaseDb, 'speakers'),
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  )

  return getTypedCollection(speakersQuery, speakerSchema)
}
