import type {
  AssignmentDocument,
  CalendarEventDocument,
  FirestoreRecord,
} from '@/types/firestore'
import {
  buildOperationalAssignmentMapByCalendarEventId,
  listSaturdayDateValuesForYear,
  toLocalDateKey,
} from '@/utils/calendar-events'

export type DashboardSaturdayEntry = {
  event: FirestoreRecord<CalendarEventDocument>
  assignment: FirestoreRecord<AssignmentDocument> | null
  isUnassigned: boolean
  isAwaitingResponse: boolean
}

export type DashboardPendingItem = {
  id: string
  kind: 'unassigned' | 'awaitingResponse'
  event: FirestoreRecord<CalendarEventDocument>
  assignment: FirestoreRecord<AssignmentDocument> | null
}

export type DashboardSpecialEventEntry = {
  event: FirestoreRecord<CalendarEventDocument>
  assignment: FirestoreRecord<AssignmentDocument> | null
}

function isUpcomingEvent(
  event: FirestoreRecord<CalendarEventDocument>,
  referenceDate: Date,
) {
  return event.date.toDate().getTime() >= referenceDate.getTime()
}

function sortCalendarEventsAscending(
  left: FirestoreRecord<CalendarEventDocument>,
  right: FirestoreRecord<CalendarEventDocument>,
) {
  return left.date.toMillis() - right.date.toMillis()
}

export function countRemainingSaturdaySlots(referenceDate: Date) {
  const referenceDateKey = toLocalDateKey(referenceDate)

  return listSaturdayDateValuesForYear(referenceDate.getFullYear()).filter(
    (dateValue) => dateValue >= referenceDateKey,
  ).length
}

export function buildDashboardSaturdayEntries(
  calendarEvents: Array<FirestoreRecord<CalendarEventDocument>>,
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
  referenceDate: Date,
  maxItems = 8,
): DashboardSaturdayEntry[] {
  const operationalAssignmentMap =
    buildOperationalAssignmentMapByCalendarEventId(assignments)

  return [...calendarEvents]
    .filter((event) => isUpcomingEvent(event, referenceDate))
    .sort(sortCalendarEventsAscending)
    .slice(0, maxItems)
    .map((event) => {
      const assignment = operationalAssignmentMap.get(event.id) ?? null

      return {
        event,
        assignment,
        isUnassigned: !event.blocksAssignments && assignment === null,
        isAwaitingResponse: assignment?.status === 'pending',
      }
    })
}

export function buildDashboardPendingItems(
  saturdayEntries: DashboardSaturdayEntry[],
): DashboardPendingItem[] {
  return saturdayEntries.flatMap((entry) => {
    if (entry.isUnassigned) {
      return [
        {
          id: `${entry.event.id}-unassigned`,
          kind: 'unassigned' as const,
          event: entry.event,
          assignment: null,
        },
      ]
    }

    if (entry.isAwaitingResponse && entry.assignment) {
      return [
        {
          id: `${entry.event.id}-awaiting-response`,
          kind: 'awaitingResponse' as const,
          event: entry.event,
          assignment: entry.assignment,
        },
      ]
    }

    return []
  })
}

export function listUpcomingSpecialEvents(
  calendarEvents: Array<FirestoreRecord<CalendarEventDocument>>,
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
  referenceDate: Date,
): DashboardSpecialEventEntry[] {
  const operationalAssignmentMap =
    buildOperationalAssignmentMapByCalendarEventId(assignments)

  return [...calendarEvents]
    .filter(
      (event) =>
        isUpcomingEvent(event, referenceDate) && event.type !== 'publicTalk',
    )
    .sort(sortCalendarEventsAscending)
    .map((event) => ({
      event,
      assignment: operationalAssignmentMap.get(event.id) ?? null,
    }))
}
