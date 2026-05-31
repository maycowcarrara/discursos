import { collection, orderBy, query, where } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  calendarEventSchema,
  type CalendarEventDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export async function listCalendarEventsByYear(
  year: number,
): Promise<Array<FirestoreRecord<CalendarEventDocument>>> {
  const calendarEventsQuery = query(
    collection(firebaseDb, 'calendarEvents'),
    where('year', '==', year),
    orderBy('date', 'asc'),
  )

  const calendarEvents = await getTypedCollection(
    calendarEventsQuery,
    calendarEventSchema,
  )

  return calendarEvents.filter((event) => event.isActive)
}
