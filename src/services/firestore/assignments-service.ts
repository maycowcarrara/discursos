import {
  Timestamp,
  collection,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  assignmentSchema,
  type AssignmentDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export async function listAssignmentsByYear(
  year: number,
): Promise<Array<FirestoreRecord<AssignmentDocument>>> {
  const rangeStart = Timestamp.fromDate(new Date(year, 0, 1, 0, 0, 0, 0))
  const rangeEnd = Timestamp.fromDate(new Date(year + 1, 0, 1, 0, 0, 0, 0))

  const assignmentsQuery = query(
    collection(firebaseDb, 'assignments'),
    where('eventDate', '>=', rangeStart),
    where('eventDate', '<', rangeEnd),
    orderBy('eventDate', 'asc'),
  )

  return getTypedCollection(assignmentsQuery, assignmentSchema)
}

export async function listRecentAssignments(
  maxItems: number,
): Promise<Array<FirestoreRecord<AssignmentDocument>>> {
  const recentAssignmentsQuery = query(
    collection(firebaseDb, 'assignments'),
    orderBy('eventDate', 'desc'),
    limit(maxItems),
  )

  return getTypedCollection(recentAssignmentsQuery, assignmentSchema)
}
