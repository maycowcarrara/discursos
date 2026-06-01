import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Timestamp } from 'firebase/firestore'

import type {
  AssignmentDocument,
  CongregationDocument,
  FirestoreRecord,
} from '../types/firestore.js'

import {
  getAssignmentMovementLabel,
  inferAssignmentMovementType,
} from './assignment-history.js'

function makeTimestamp(value: string) {
  return Timestamp.fromDate(new Date(`${value}T12:00:00`))
}

function makeCongregation(
  id: string,
  isLocal: boolean,
): FirestoreRecord<CongregationDocument> {
  const timestamp = makeTimestamp('2026-06-01')

  return {
    id,
    name: `Congregacao ${id}`,
    address: '',
    city: '',
    state: 'SP',
    zipCode: '',
    mapsUrl: '',
    meetingDay: 'sabado',
    meetingTime: '19:00',
    publicTalkCoordinatorContact: '',
    notes: '',
    isLocal,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function makeAssignment(
  id: string,
  overrides: Partial<AssignmentDocument> = {},
): FirestoreRecord<AssignmentDocument> {
  const timestamp = makeTimestamp('2026-06-07')

  return {
    id,
    calendarEventId: 'event-1',
    eventDate: timestamp,
    eventType: 'publicTalk',
    localCongregationId: 'local',
    localCongregationName: 'Local',
    speakerId: 'speaker-1',
    speakerName: 'Orador 1',
    speakerType: 'local',
    originCongregationId: 'origin-1',
    originCongregationName: 'Origem 1',
    themeId: 'theme-1',
    themeNumber: 101,
    themeTitle: 'Tema 101',
    status: 'confirmed',
    notes: '',
    confirmationToken: null,
    confirmedAt: timestamp,
    responseAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

test('classifica orador visitante quando destino e congregacao local', () => {
  const congregationsById = new Map([
    ['local', makeCongregation('local', true)],
    ['origin-1', makeCongregation('origin-1', false)],
  ])
  const assignment = makeAssignment('assignment-1', {
    speakerType: 'visitor',
    localCongregationId: 'local',
  })

  const movementType = inferAssignmentMovementType(assignment, congregationsById)

  assert.equal(movementType, 'incoming')
  assert.equal(getAssignmentMovementLabel(movementType), 'Orador visitante')
})

test('classifica discurso fora quando orador local fala em congregacao parceira', () => {
  const congregationsById = new Map([
    ['partner', makeCongregation('partner', false)],
    ['origin-1', makeCongregation('origin-1', true)],
  ])
  const assignment = makeAssignment('assignment-2', {
    speakerType: 'local',
    localCongregationId: 'partner',
  })

  const movementType = inferAssignmentMovementType(assignment, congregationsById)

  assert.equal(movementType, 'outgoing')
  assert.equal(getAssignmentMovementLabel(movementType), 'Discurso fora')
})

test('mantem designacao local como fallback seguro quando o destino nao esta carregado', () => {
  const congregationsById = new Map<string, FirestoreRecord<CongregationDocument>>()
  const assignment = makeAssignment('assignment-3', {
    speakerType: 'visitor',
    localCongregationId: 'desconhecida',
  })

  const movementType = inferAssignmentMovementType(assignment, congregationsById)

  assert.equal(movementType, 'local')
  assert.equal(getAssignmentMovementLabel(movementType), 'Designacao local')
})
