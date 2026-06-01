import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildGoogleCalendarEventIdFromDigest,
  resolveCalendarRetryDecision,
  shouldPublishStandaloneCalendarEvent,
} from './google-calendar-sync.js'

test('publica automaticamente apenas evento especial isolado', () => {
  assert.equal(shouldPublishStandaloneCalendarEvent('special'), true)
  assert.equal(shouldPublishStandaloneCalendarEvent('visit'), false)
  assert.equal(shouldPublishStandaloneCalendarEvent('congress'), false)
  assert.equal(shouldPublishStandaloneCalendarEvent('assembly'), false)
  assert.equal(shouldPublishStandaloneCalendarEvent('publicTalk'), false)
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
