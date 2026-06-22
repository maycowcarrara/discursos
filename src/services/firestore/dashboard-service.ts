import type {
  AssignmentDocument,
  CalendarEventDocument,
  FirestoreRecord,
} from '@/types/firestore'
import {
  selectUpcomingSaturdayEvents,
  selectUpcomingSpecialCalendarEvents,
} from '@/utils/dashboard'

import { listAssignmentsByCalendarEventIds } from './assignments-service'
import { listCalendarEventsByYear } from './calendar-events-service'

const DASHBOARD_SATURDAY_TARGET = 8
const DASHBOARD_SPECIAL_TARGET = 4
async function listUpcomingDashboardCalendarEvents(referenceDate: Date) {
  const currentYear = referenceDate.getFullYear()
  const nextYear = currentYear + 1
  const [currentYearEvents, nextYearEvents] = await Promise.all([
    listCalendarEventsByYear(currentYear),
    listCalendarEventsByYear(nextYear),
  ])

  return [...currentYearEvents, ...nextYearEvents].filter(
    (event) => event.date.toDate().getTime() >= referenceDate.getTime(),
  )
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
      ...calendarEvents.map((event) => event.id),
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
