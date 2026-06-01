import { Timestamp } from 'firebase/firestore'

import type {
  CalendarEventDocument,
  FirestoreRecord,
} from '@/types/firestore'
import {
  calendarEventDefaultTitles,
  parseDateInputValue,
  listSaturdayDateValuesForYear,
  toLocalDateKey,
} from '@/utils/calendar-events'

export type CalendarAgendaEvent = FirestoreRecord<CalendarEventDocument> & {
  viewId: string
  viewSource: 'explicit' | 'implicit'
}

const implicitCalendarEventIdPattern = /^active-(\d{4}-\d{2}-\d{2})$/

export function getImplicitCalendarEventId(dateKey: string) {
  return `active-${dateKey}`
}

export function getDateKeyFromImplicitCalendarEventId(id: string) {
  const match = implicitCalendarEventIdPattern.exec(id)

  return match?.[1] ?? null
}

export function isImplicitCalendarAgendaEvent(
  event: Pick<CalendarAgendaEvent, 'viewSource'>,
) {
  return event.viewSource === 'implicit'
}

export function buildImplicitPublicTalkEvent(dateValue: string): CalendarAgendaEvent {
  const parsedDate = parseDateInputValue(dateValue)
  const eventTimestamp = Timestamp.fromDate(parsedDate)

  return {
    id: getImplicitCalendarEventId(dateValue),
    year: parsedDate.getFullYear(),
    date: eventTimestamp,
    type: 'publicTalk',
    title: calendarEventDefaultTitles.publicTalk,
    congregationId: null,
    congregationName: null,
    blocksAssignments: false,
    isActive: true,
    googleCalendarEventId: null,
    googleCalendarCalendarId: null,
    googleCalendarSyncStatus: 'synced',
    googleCalendarSyncError: null,
    googleCalendarManualSyncRequestedAt: null,
    googleCalendarClaimId: null,
    googleCalendarClaimedAt: null,
    googleCalendarRetryCount: 0,
    googleCalendarSyncScheduledFor: null,
    googleCalendarSyncUpdatedAt: eventTimestamp,
    createdAt: eventTimestamp,
    updatedAt: eventTimestamp,
    viewId: `implicit:${getImplicitCalendarEventId(dateValue)}`,
    viewSource: 'implicit',
  }
}

export function buildMaterializedImplicitPublicTalkDocument(options: {
  actorUid: string
  now: Timestamp
  slot: FirestoreRecord<CalendarEventDocument>
}): CalendarEventDocument {
  return {
    year: options.slot.year,
    date: options.slot.date,
    type: 'publicTalk',
    title: options.slot.title,
    description: options.slot.description,
    congregationId: options.slot.congregationId,
    congregationName: options.slot.congregationName,
    blocksAssignments: false,
    isActive: true,
    googleCalendarEventId: null,
    googleCalendarCalendarId: null,
    googleCalendarSyncStatus: 'synced',
    googleCalendarSyncError: null,
    googleCalendarManualSyncRequestedAt: null,
    googleCalendarClaimId: null,
    googleCalendarClaimedAt: null,
    googleCalendarRetryCount: 0,
    googleCalendarSyncScheduledFor: null,
    googleCalendarSyncUpdatedAt: options.now,
    createdAt: options.now,
    updatedAt: options.now,
    createdBy: options.actorUid,
    updatedBy: options.actorUid,
  }
}

function normalizeExplicitCalendarEvent(
  event: FirestoreRecord<CalendarEventDocument>,
): CalendarAgendaEvent {
  return {
    ...event,
    viewId: `${event.isActive ? 'explicit' : 'archived'}:${event.id}`,
    viewSource: 'explicit',
  }
}

function sortCalendarEventsByDate(
  left: FirestoreRecord<CalendarEventDocument>,
  right: FirestoreRecord<CalendarEventDocument>,
) {
  const dateDifference = left.date.toMillis() - right.date.toMillis()

  if (dateDifference !== 0) {
    return dateDifference
  }

  return left.id.localeCompare(right.id)
}

export function mergeCalendarEventsWithImplicitSaturdaySlots(
  year: number,
  explicitEvents: Array<FirestoreRecord<CalendarEventDocument>>,
) {
  const activeExplicitEvents = explicitEvents.filter((event) => event.isActive)
  const activeDateKeys = new Set(
    activeExplicitEvents.map((event) => toLocalDateKey(event.date)),
  )
  const mergedEvents = activeExplicitEvents.map(normalizeExplicitCalendarEvent)

  listSaturdayDateValuesForYear(year).forEach((dateValue) => {
    if (activeDateKeys.has(dateValue)) {
      return
    }

    mergedEvents.push(buildImplicitPublicTalkEvent(dateValue))
  })

  return mergedEvents.sort(sortCalendarEventsByDate)
}

export function buildCalendarEventsManagementView(
  year: number,
  explicitEvents: Array<FirestoreRecord<CalendarEventDocument>>,
) {
  const activeMergedEvents = mergeCalendarEventsWithImplicitSaturdaySlots(
    year,
    explicitEvents,
  )
  const archivedExplicitEvents = explicitEvents
    .filter((event) => !event.isActive)
    .map(normalizeExplicitCalendarEvent)
    .sort((left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis())

  return [...activeMergedEvents, ...archivedExplicitEvents]
}

export function buildImplicitCalendarEventFromId(id: string) {
  const dateKey = getDateKeyFromImplicitCalendarEventId(id)

  if (!dateKey) {
    return null
  }

  const parsedDate = parseDateInputValue(dateKey)

  if (parsedDate.getDay() !== 6) {
    return null
  }

  return buildImplicitPublicTalkEvent(dateKey)
}
