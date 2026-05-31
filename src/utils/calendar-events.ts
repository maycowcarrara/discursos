import type { Timestamp } from 'firebase/firestore'

import type {
  AssignmentStatus,
  CalendarEventType,
  FirestoreRecord,
  AssignmentDocument,
  CalendarEventDocument,
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
  publicTalk: 'Discurso publico',
  congress: 'Congresso',
  assembly: 'Assembleia',
  visit: 'Visita',
  special: 'Especial',
}

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Recusado',
  cancelled: 'Cancelado',
  replaced: 'Substituido',
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
