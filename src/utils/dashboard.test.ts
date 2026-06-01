import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Timestamp } from 'firebase/firestore'

import type {
  AssignmentDocument,
  CalendarEventDocument,
  FirestoreRecord,
} from '../types/firestore.js'

import {
  buildDashboardPendingItems,
  buildDashboardSaturdayEntries,
  listUpcomingSpecialEvents,
  selectUpcomingSaturdayEvents,
} from './dashboard.js'

function makeTimestamp(value: string) {
  return Timestamp.fromDate(new Date(`${value}T12:00:00`))
}

function makeEvent(
  id: string,
  date: string,
  overrides: Partial<CalendarEventDocument> = {},
): FirestoreRecord<CalendarEventDocument> {
  const timestamp = makeTimestamp(date)

  return {
    id,
    year: timestamp.toDate().getFullYear(),
    date: timestamp,
    type: 'publicTalk',
    title: `Evento ${id}`,
    congregationId: null,
    congregationName: null,
    blocksAssignments: false,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

function makeAssignment(
  id: string,
  calendarEventId: string,
  eventDate: string,
  overrides: Partial<AssignmentDocument> = {},
): FirestoreRecord<AssignmentDocument> {
  const timestamp = makeTimestamp(eventDate)

  return {
    id,
    calendarEventId,
    eventDate: timestamp,
    eventType: 'publicTalk',
    localCongregationId: 'local',
    localCongregationName: 'Local',
    speakerId: 'speaker-1',
    speakerName: 'Orador 1',
    speakerType: 'visitor',
    originCongregationId: 'origin-1',
    originCongregationName: 'Origem 1',
    themeId: 'theme-1',
    themeNumber: 101,
    themeTitle: 'Tema 101',
    status: 'pending',
    notes: '',
    confirmationToken: null,
    confirmedAt: null,
    responseAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

test('selectUpcomingSaturdayEvents ignora evento futuro em dia util', () => {
  const referenceDate = new Date('2026-06-01T00:00:00')
  const events = [
    makeEvent('weekday-special', '2026-06-02', {
      type: 'special',
      title: 'Especial na terca',
    }),
    makeEvent('first-saturday', '2026-06-06'),
    makeEvent('second-saturday', '2026-06-13', {
      type: 'visit',
      title: 'Visita no sabado',
    }),
  ]

  const saturdayEvents = selectUpcomingSaturdayEvents(events, referenceDate, 8)

  assert.deepEqual(
    saturdayEvents.map((event) => event.id),
    ['first-saturday', 'second-saturday'],
  )
})

test('buildDashboardSaturdayEntries e pendencias consideram apenas sabados reais', () => {
  const referenceDate = new Date('2026-06-01T00:00:00')
  const events = [
    makeEvent('weekday-special', '2026-06-03', {
      type: 'special',
      title: 'Especial de quarta',
    }),
    makeEvent('unassigned-saturday', '2026-06-06', {
      title: 'Sabado sem orador',
    }),
    makeEvent('pending-saturday', '2026-06-13', {
      title: 'Sabado aguardando resposta',
    }),
  ]
  const assignments = [
    makeAssignment('assignment-1', 'pending-saturday', '2026-06-13', {
      speakerName: 'Carlos',
      status: 'pending',
    }),
  ]

  const saturdayEntries = buildDashboardSaturdayEntries(
    events,
    assignments,
    referenceDate,
  )
  const pendingItems = buildDashboardPendingItems(saturdayEntries)

  assert.equal(saturdayEntries.length, 2)
  assert.deepEqual(
    saturdayEntries.map((entry) => entry.event.id),
    ['unassigned-saturday', 'pending-saturday'],
  )
  assert.deepEqual(
    pendingItems.map((item) => item.kind),
    ['unassigned', 'awaitingResponse'],
  )
})

test('selectUpcomingSaturdayEvents atravessa a virada de ano sem perder a janela', () => {
  const referenceDate = new Date('2026-12-27T00:00:00')
  const events = [
    makeEvent('late-december', '2027-01-01', {
      type: 'special',
      title: 'Confraternizacao de sexta',
    }),
    makeEvent('first-january-saturday', '2027-01-02'),
    makeEvent('second-january-saturday', '2027-01-09'),
  ]

  const saturdayEvents = selectUpcomingSaturdayEvents(events, referenceDate, 8)

  assert.deepEqual(
    saturdayEvents.map((event) => event.id),
    ['first-january-saturday', 'second-january-saturday'],
  )
})

test('listUpcomingSpecialEvents preserva especiais futuros mesmo fora do sabado', () => {
  const referenceDate = new Date('2026-06-01T00:00:00')
  const events = [
    makeEvent('weekday-special', '2026-06-02', {
      type: 'special',
      title: 'Especial de terca',
    }),
    makeEvent('saturday-visit', '2026-06-06', {
      type: 'visit',
      title: 'Visita de sabado',
    }),
    makeEvent('ordinary-saturday', '2026-06-13'),
  ]
  const assignments = [
    makeAssignment('assignment-visit', 'saturday-visit', '2026-06-06', {
      status: 'confirmed',
      speakerName: 'Joao',
    }),
  ]

  const specialEvents = listUpcomingSpecialEvents(events, assignments, referenceDate)

  assert.deepEqual(
    specialEvents.map((entry) => entry.event.id),
    ['weekday-special', 'saturday-visit'],
  )
  assert.equal(specialEvents[0]?.assignment, null)
  assert.equal(specialEvents[1]?.assignment?.speakerName, 'Joao')
})
