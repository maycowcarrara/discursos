import type {
  AssignmentDocument,
  CalendarEventDocument,
  FirestoreRecord,
} from '@/types/firestore'

import { listUpcomingAssignments } from './assignments-service'
import { listCalendarEventsByYear } from './calendar-events-service'

const DASHBOARD_ASSIGNMENT_TARGET = 80

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
  const [calendarEvents, assignments] = await Promise.all([
    listUpcomingDashboardCalendarEvents(referenceDate),
    listUpcomingAssignments(referenceDate, DASHBOARD_ASSIGNMENT_TARGET),
  ])

  return {
    assignments,
    calendarEvents,
  }
}
