import {
  Timestamp,
  collection,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase-db'
import {
  calendarEventSchema,
  type AssignmentDocument,
  type CalendarEventDocument,
  type FirestoreRecord,
} from '@/types/firestore'
import {
  selectUpcomingSaturdayEvents,
  selectUpcomingSpecialCalendarEvents,
} from '@/utils/dashboard'

import { listAssignmentsByCalendarEventIds } from './assignments-service'
import { getTypedCollection } from './shared'

const DASHBOARD_SATURDAY_TARGET = 8
const DASHBOARD_SPECIAL_TARGET = 4
const DASHBOARD_EVENT_BATCH_SIZE = 24
const DASHBOARD_MAX_BATCHES = 6

function getCalendarEventsCollection() {
  return collection(firebaseDb, 'calendarEvents')
}

async function listUpcomingCalendarEventBatch(
  referenceDate: Date,
  cursorDate?: Timestamp,
) {
  const constraints = [
    where('isActive', '==', true),
    where('date', '>=', Timestamp.fromDate(referenceDate)),
    orderBy('date', 'asc' as const),
    limit(DASHBOARD_EVENT_BATCH_SIZE),
  ]

  const calendarEventsQuery = cursorDate
    ? query(getCalendarEventsCollection(), ...constraints, startAfter(cursorDate))
    : query(getCalendarEventsCollection(), ...constraints)

  return getTypedCollection(calendarEventsQuery, calendarEventSchema)
}

async function listUpcomingDashboardCalendarEvents(referenceDate: Date) {
  const loadedEvents: Array<FirestoreRecord<CalendarEventDocument>> = []
  let cursorDate: Timestamp | undefined

  for (let batchIndex = 0; batchIndex < DASHBOARD_MAX_BATCHES; batchIndex += 1) {
    const batch = await listUpcomingCalendarEventBatch(referenceDate, cursorDate)

    loadedEvents.push(...batch)

    const hasEnoughSaturdayCoverage =
      selectUpcomingSaturdayEvents(
        loadedEvents,
        referenceDate,
        DASHBOARD_SATURDAY_TARGET,
      ).length >= DASHBOARD_SATURDAY_TARGET
    const hasEnoughSpecialCoverage =
      selectUpcomingSpecialCalendarEvents(
        loadedEvents,
        referenceDate,
        DASHBOARD_SPECIAL_TARGET,
      ).length >= DASHBOARD_SPECIAL_TARGET

    if (
      batch.length < DASHBOARD_EVENT_BATCH_SIZE ||
      (hasEnoughSaturdayCoverage && hasEnoughSpecialCoverage)
    ) {
      break
    }

    cursorDate = batch[batch.length - 1]?.date

    if (!cursorDate) {
      break
    }
  }

  return loadedEvents
}

export type DashboardSnapshot = {
  assignments: Array<FirestoreRecord<AssignmentDocument>>
  calendarEvents: Array<FirestoreRecord<CalendarEventDocument>>
}

export async function getDashboardSnapshot(
  referenceDate: Date,
): Promise<DashboardSnapshot> {
  const calendarEvents = await listUpcomingDashboardCalendarEvents(referenceDate)
  const relevantEventIds = Array.from(
    new Set([
      ...selectUpcomingSaturdayEvents(
        calendarEvents,
        referenceDate,
        DASHBOARD_SATURDAY_TARGET,
      ).map((event) => event.id),
      ...selectUpcomingSpecialCalendarEvents(
        calendarEvents,
        referenceDate,
        DASHBOARD_SPECIAL_TARGET,
      ).map((event) => event.id),
    ]),
  )
  const assignments =
    relevantEventIds.length > 0
      ? await listAssignmentsByCalendarEventIds(relevantEventIds)
      : []

  return {
    assignments,
    calendarEvents,
  }
}
