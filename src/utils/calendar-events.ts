import type { Timestamp } from 'firebase/firestore'

import type {
  AssignmentStatus,
  AssignmentDocument,
  CalendarEventDocument,
  CalendarEventType,
  FirestoreRecord,
} from '@/types/firestore'

export type CalendarMonthSection = {
  monthIndex: number
  monthLabel: string
  events: Array<FirestoreRecord<CalendarEventDocument>>
}

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
})

const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
})

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
})

export const calendarEventTypeLabels: Record<CalendarEventType, string> = {
  publicTalk: 'Discurso público',
  congress: 'Congresso',
  assembly: 'Assembleia',
  visit: 'Visita',
  special: 'Evento especial',
}

export const calendarEventDefaultTitles: Record<CalendarEventType, string> = {
  publicTalk: 'Discurso público',
  congress: 'Congresso',
  assembly: 'Assembleia',
  visit: 'Visita',
  special: 'Evento especial',
}

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Recusado',
  cancelled: 'Cancelado',
  replaced: 'Substituído',
}

export function groupCalendarEventsByMonth(
  year: number,
  events: Array<FirestoreRecord<CalendarEventDocument>>,
): CalendarMonthSection[] {
  const sections = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(year, monthIndex, 1)

    return {
      monthIndex,
      monthLabel: capitalize(monthFormatter.format(monthDate)),
      events: [] as Array<FirestoreRecord<CalendarEventDocument>>,
    }
  })

  events.forEach((event) => {
    const monthIndex = event.date.toDate().getMonth()
    const monthSection = sections[monthIndex]

    if (monthSection) {
      monthSection.events.push(event)
    }
  })

  return sections
}

export function formatCalendarDay(event: FirestoreRecord<CalendarEventDocument>) {
  return dayFormatter.format(event.date.toDate())
}

export function formatCalendarDate(
  event: FirestoreRecord<CalendarEventDocument>,
) {
  return fullDateFormatter.format(event.date.toDate())
}

export function formatTimestampDate(date: Timestamp) {
  return fullDateFormatter.format(date.toDate())
}

export function buildAssignmentMapByCalendarEventId(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
) {
  return new Map(
    assignments.map((assignment) => [assignment.calendarEventId, assignment]),
  )
}

export function buildAssignmentCountMapByCalendarEventId(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
) {
  return assignments.reduce((assignmentCountMap, assignment) => {
    const currentCount = assignmentCountMap.get(assignment.calendarEventId) ?? 0

    assignmentCountMap.set(assignment.calendarEventId, currentCount + 1)

    return assignmentCountMap
  }, new Map<string, number>())
}

export function buildOperationalAssignmentMapByCalendarEventId(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
) {
  const operationalAssignments = assignments.filter((assignment) =>
    isAssignmentCoveringCalendarSlot(assignment.status),
  )

  operationalAssignments.sort((left, right) => {
    const updatedAtDifference =
      right.updatedAt.toMillis() - left.updatedAt.toMillis()

    if (updatedAtDifference !== 0) {
      return updatedAtDifference
    }

    return right.createdAt.toMillis() - left.createdAt.toMillis()
  })

  return operationalAssignments.reduce((assignmentMap, assignment) => {
    if (!assignmentMap.has(assignment.calendarEventId)) {
      assignmentMap.set(assignment.calendarEventId, assignment)
    }

    return assignmentMap
  }, new Map<string, FirestoreRecord<AssignmentDocument>>())
}

export function isAssignmentCoveringCalendarSlot(status: AssignmentStatus) {
  return status === 'pending' || status === 'confirmed'
}

export function formatDateInputValue(value: Timestamp | Date) {
  const date = value instanceof Date ? value : value.toDate()

  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function parseDateInputValue(value: string) {
  const [yearValue, monthValue, dayValue] = value.split('-')
  const year = Number.parseInt(yearValue ?? '', 10)
  const month = Number.parseInt(monthValue ?? '', 10)
  const day = Number.parseInt(dayValue ?? '', 10)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error('Informe uma data válida para o calendário.')
  }

  const parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0)

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new Error('Informe uma data válida para o calendário.')
  }

  return parsedDate
}

export function toLocalDateKey(value: Timestamp | Date) {
  return formatDateInputValue(value)
}

export function listSaturdayDateValuesForYear(year: number) {
  const firstDayOfYear = new Date(year, 0, 1, 12, 0, 0, 0)
  const firstSaturdayOffset = (6 - firstDayOfYear.getDay() + 7) % 7
  const cursor = new Date(year, 0, 1 + firstSaturdayOffset, 12, 0, 0, 0)
  const saturdayDates: string[] = []

  while (cursor.getFullYear() === year) {
    saturdayDates.push(formatDateInputValue(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  return saturdayDates
}

export function findFirstAvailableSaturdayDate(
  saturdayDates: string[],
  occupiedSaturdayKeys: Set<string>,
) {
  return (
    saturdayDates.find((dateValue) => !occupiedSaturdayKeys.has(dateValue)) ?? ''
  )
}

export function getBlocksAssignmentsForEventType(type: CalendarEventType) {
  return type !== 'publicTalk'
}

export function doesCalendarEventBlockAssignments(
  event: Pick<CalendarEventDocument, 'blocksAssignments' | 'type'>,
) {
  return event.blocksAssignments || getBlocksAssignmentsForEventType(event.type)
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
