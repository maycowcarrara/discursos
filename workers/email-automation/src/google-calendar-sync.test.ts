import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildGoogleCalendarEventIdFromDigest,
  resolveGoogleCalendarAssignmentKind,
  resolveCalendarRetryDecision,
  shouldProcessManualCalendarSync,
  shouldPublishStandaloneCalendarEvent,
} from './google-calendar-sync.js'

test('publica automaticamente apenas evento especial isolado', () => {
  assert.equal(shouldPublishStandaloneCalendarEvent('special'), true)
  assert.equal(shouldPublishStandaloneCalendarEvent('visit'), false)
  assert.equal(shouldPublishStandaloneCalendarEvent('congress'), false)
  assert.equal(shouldPublishStandaloneCalendarEvent('assembly'), false)
  assert.equal(shouldPublishStandaloneCalendarEvent('publicTalk'), false)
})

test('classifica todas as designacoes operacionais publicaveis', () => {
  assert.equal(
    resolveGoogleCalendarAssignmentKind({
      destinationIsLocal: true,
      speakerType: 'visitor',
    }),
    'incomingVisitor',
  )
  assert.equal(
    resolveGoogleCalendarAssignmentKind({
      destinationIsLocal: true,
      speakerType: 'local',
    }),
    'localTalk',
  )
  assert.equal(
    resolveGoogleCalendarAssignmentKind({
      destinationIsLocal: false,
      speakerType: 'local',
    }),
    'outgoingTalk',
  )
  assert.equal(
    resolveGoogleCalendarAssignmentKind({
      destinationIsLocal: false,
      speakerType: 'visitor',
    }),
    null,
  )
})

test('exige pedido manual atual para publicar ou atualizar designacao', () => {
  assert.equal(
    shouldProcessManualCalendarSync({
      hasLatestAssignment: true,
      hasRemoteEvent: false,
      hasSyncEntry: true,
      lastRelevantChangeAt: 200,
      requestedAt: 200,
    }),
    true,
  )
  assert.equal(
    shouldProcessManualCalendarSync({
      hasLatestAssignment: true,
      hasRemoteEvent: true,
      hasSyncEntry: true,
      lastRelevantChangeAt: 201,
      requestedAt: 200,
    }),
    false,
  )
})

test('nao publica slot vazio e permite remover vinculo remoto encerrado', () => {
  assert.equal(
    shouldProcessManualCalendarSync({
      hasLatestAssignment: false,
      hasRemoteEvent: false,
      hasSyncEntry: false,
      lastRelevantChangeAt: 0,
      requestedAt: 0,
    }),
    false,
  )
  assert.equal(
    shouldProcessManualCalendarSync({
      hasLatestAssignment: false,
      hasRemoteEvent: true,
      hasSyncEntry: false,
      lastRelevantChangeAt: 200,
      requestedAt: 0,
    }),
    true,
  )
  assert.equal(
    shouldProcessManualCalendarSync({
      hasLatestAssignment: true,
      hasRemoteEvent: true,
      hasSyncEntry: false,
      lastRelevantChangeAt: 200,
      requestedAt: 200,
    }),
    true,
  )
})

test('reagenda falha transitoria antes de encerrar apos o limite', () => {
  const now = new Date('2026-06-01T12:00:00.000Z')
  const retry = resolveCalendarRetryDecision(0, now)
  const exhausted = resolveCalendarRetryDecision(2, now)

  assert.equal(retry.status, 'pending')
  assert.equal(retry.nextRetryCount, 1)
  assert.equal(retry.scheduledFor?.toISOString(), '2026-06-01T12:30:00.000Z')
  assert.equal(exhausted.status, 'error')
  assert.equal(exhausted.nextRetryCount, 3)
  assert.equal(exhausted.scheduledFor, null)
})

test('gera id remoto estavel aceito pelo Google Calendar', () => {
  const digest = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
  const eventId = buildGoogleCalendarEventIdFromDigest(digest)

  assert.equal(eventId, buildGoogleCalendarEventIdFromDigest(digest))
  assert.match(eventId, /^[0-9a-v]+$/)
  assert.ok(eventId.length >= 5)
})
