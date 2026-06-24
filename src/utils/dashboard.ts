import type {
  AssignmentDocument,
  AssignmentStatus,
  CalendarEventDocument,
  CalendarEventType,
  FirestoreRecord,
} from '../types/firestore.js'

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

type DateLike = Date | { toDate(): Date }

type MillisecondsLike = DateLike & {
  toMillis?: () => number
}

function toJsDate(value: DateLike) {
  return value instanceof Date ? value : value.toDate()
}

function toMillis(value: MillisecondsLike) {
  if (typeof value.toMillis === 'function') {
    return value.toMillis()
  }

  return toJsDate(value).getTime()
}

export function toLocalDateKey(value: DateLike) {
  const date = toJsDate(value)

  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function listSaturdayDateValuesForYear(year: number) {
  const firstDayOfYear = new Date(year, 0, 1, 12, 0, 0, 0)
  const firstSaturdayOffset = (6 - firstDayOfYear.getDay() + 7) % 7
  const cursor = new Date(year, 0, 1 + firstSaturdayOffset, 12, 0, 0, 0)
  const saturdayDates: string[] = []

  while (cursor.getFullYear() === year) {
    saturdayDates.push(toLocalDateKey(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  return saturdayDates
}

function isAssignmentCoveringCalendarSlot(status: AssignmentStatus) {
  return status === 'pending' || status === 'confirmed'
}

function buildOperationalAssignmentMapByCalendarEventId(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
) {
  const operationalAssignments = assignments.filter((assignment) =>
    isAssignmentCoveringCalendarSlot(assignment.status),
  )

  operationalAssignments.sort((left, right) => {
    const updatedAtDifference = toMillis(right.updatedAt) - toMillis(left.updatedAt)

    if (updatedAtDifference !== 0) {
      return updatedAtDifference
    }

    return toMillis(right.createdAt) - toMillis(left.createdAt)
  })

  return operationalAssignments.reduce((assignmentMap, assignment) => {
    if (!assignmentMap.has(assignment.calendarEventId)) {
      assignmentMap.set(assignment.calendarEventId, assignment)
    }

    return assignmentMap
  }, new Map<string, FirestoreRecord<AssignmentDocument>>())
}

function isUpcomingEvent(
  event: FirestoreRecord<CalendarEventDocument>,
  referenceDate: Date,
) {
  return toJsDate(event.date).getTime() >= referenceDate.getTime()
}

export function isMeetingDate(date: Date, meetingDayIndex: number | null = null) {
  return date.getDay() === (meetingDayIndex ?? 6)
}

export function isSaturdayDate(date: Date) {
  return isMeetingDate(date, 6)
}

export function isMeetingCalendarEvent(
  event: FirestoreRecord<CalendarEventDocument>,
  meetingDayIndex: number | null = null,
) {
  return isMeetingDate(toJsDate(event.date), meetingDayIndex)
}

export function isSaturdayCalendarEvent(
  event: FirestoreRecord<CalendarEventDocument>,
) {
  return isMeetingCalendarEvent(event, 6)
}

export function isSpecialCalendarEventType(type: CalendarEventType) {
  return type !== 'publicTalk'
}

function doesCalendarEventBlockAssignments(
  event: Pick<CalendarEventDocument, 'blocksAssignments' | 'type'>,
) {
  return event.blocksAssignments || isSpecialCalendarEventType(event.type)
}

function sortCalendarEventsAscending(
  left: FirestoreRecord<CalendarEventDocument>,
  right: FirestoreRecord<CalendarEventDocument>,
) {
  return toMillis(left.date) - toMillis(right.date)
}

export function countRemainingSaturdaySlots(referenceDate: Date) {
  const referenceDateKey = toLocalDateKey(referenceDate)

  return listSaturdayDateValuesForYear(referenceDate.getFullYear()).filter(
    (dateValue) => dateValue >= referenceDateKey,
  ).length
}

export function selectUpcomingSaturdayEvents(
  calendarEvents: Array<FirestoreRecord<CalendarEventDocument>>,
  referenceDate: Date,
  maxItems = 8,
  meetingDayIndex: number | null = null,
) {
  return [...calendarEvents]
    .filter(
      (event) =>
        isUpcomingEvent(event, referenceDate) &&
        isMeetingCalendarEvent(event, meetingDayIndex),
    )
    .sort(sortCalendarEventsAscending)
    .slice(0, maxItems)
}

export function selectUpcomingSpecialCalendarEvents(
  calendarEvents: Array<FirestoreRecord<CalendarEventDocument>>,
  referenceDate: Date,
  maxItems?: number,
) {
  const specialEvents = [...calendarEvents]
    .filter(
      (event) =>
        isUpcomingEvent(event, referenceDate) &&
        isSpecialCalendarEventType(event.type),
    )
    .sort(sortCalendarEventsAscending)

  if (typeof maxItems === 'number') {
    return specialEvents.slice(0, maxItems)
  }

  return specialEvents
}

export function buildDashboardSaturdayEntries(
  calendarEvents: Array<FirestoreRecord<CalendarEventDocument>>,
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
  referenceDate: Date,
  maxItems = 8,
  meetingDayIndex: number | null = null,
): DashboardSaturdayEntry[] {
  const operationalAssignmentMap =
    buildOperationalAssignmentMapByCalendarEventId(assignments)

  return selectUpcomingSaturdayEvents(
    calendarEvents,
    referenceDate,
    maxItems,
    meetingDayIndex,
  )
    .map((event) => {
      const assignment = operationalAssignmentMap.get(event.id) ?? null

      return {
        event,
        assignment,
        isUnassigned: !doesCalendarEventBlockAssignments(event) && assignment === null,
        isAwaitingResponse: assignment?.status === 'pending',
      }
    })
}

export function buildDashboardPendingItems(
  saturdayEntries: DashboardSaturdayEntry[],
): DashboardPendingItem[] {
  return saturdayEntries.flatMap<DashboardPendingItem>((entry) => {
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

  return selectUpcomingSpecialCalendarEvents(calendarEvents, referenceDate)
    .map((event) => ({
      event,
      assignment: operationalAssignmentMap.get(event.id) ?? null,
    }))
}
