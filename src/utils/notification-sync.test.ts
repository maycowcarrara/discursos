import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Timestamp } from 'firebase/firestore'

import type { NotificationDocument } from '../types/firestore.js'

import { mergeNotificationDocumentForSync } from './notification-sync.js'

function createNotificationDocument(
  overrides: Partial<NotificationDocument> = {},
): NotificationDocument {
  const createdAt = Timestamp.fromDate(new Date(2026, 4, 1, 10, 0, 0, 0))
  const scheduledFor = Timestamp.fromDate(new Date(2026, 4, 9, 9, 0, 0, 0))

  return {
    assignmentId: 'assignment-1',
    channel: 'email',
    createdAt,
    errorMessage: null,
    provider: 'emailjs',
    recipientEmail: 'orador@example.com',
    retryCount: 0,
    scheduledFor,
    sentAt: null,
    speakerId: 'speaker-1',
    status: 'pending',
    subject: 'Confirmacao de designacao - Organizacao',
    type: 'confirmation',
    updatedAt: createdAt,
    ...overrides,
  }
}

test('preserva notificacao ja enviada quando a entrega continua a mesma', () => {
  const sentAt = Timestamp.fromDate(new Date(2026, 4, 1, 10, 5, 0, 0))
  const existingNotification = createNotificationDocument({
    sentAt,
    status: 'sent',
    type: 'reminder7d',
  })
  const nextNotification = createNotificationDocument({
    status: 'pending',
    type: 'reminder7d',
  })

  const mergedNotification = mergeNotificationDocumentForSync(
    existingNotification,
    nextNotification,
  )

  assert.equal(mergedNotification.status, 'sent')
  assert.equal(mergedNotification.sentAt?.toMillis(), sentAt.toMillis())
})

test('cancela uma notificacao ainda pendente quando a nova sincronizacao exige cancelamento', () => {
  const existingNotification = createNotificationDocument({
    status: 'pending',
  })
  const nextNotification = createNotificationDocument({
    status: 'cancelled',
  })

  const mergedNotification = mergeNotificationDocumentForSync(
    existingNotification,
    nextNotification,
  )

  assert.equal(mergedNotification.status, 'cancelled')
  assert.equal(mergedNotification.sentAt, null)
})

test('reinicia o ciclo quando o destinatario muda', () => {
  const sentAt = Timestamp.fromDate(new Date(2026, 4, 1, 10, 5, 0, 0))
  const existingNotification = createNotificationDocument({
    recipientEmail: 'anterior@example.com',
    retryCount: 2,
    sentAt,
    status: 'failed',
  })
  const nextNotification = createNotificationDocument({
    recipientEmail: 'novo@example.com',
    retryCount: 0,
    sentAt: null,
    status: 'pending',
  })

  const mergedNotification = mergeNotificationDocumentForSync(
    existingNotification,
    nextNotification,
  )

  assert.equal(mergedNotification.status, 'pending')
  assert.equal(mergedNotification.retryCount, 0)
  assert.equal(mergedNotification.sentAt, null)
})

test('reabre uma notificacao cancelada quando a designacao volta a exigir envio', () => {
  const existingNotification = createNotificationDocument({
    errorMessage: 'Cancelada anteriormente.',
    status: 'cancelled',
  })
  const nextNotification = createNotificationDocument({
    errorMessage: null,
    status: 'pending',
  })

  const mergedNotification = mergeNotificationDocumentForSync(
    existingNotification,
    nextNotification,
  )

  assert.equal(mergedNotification.status, 'pending')
  assert.equal(mergedNotification.errorMessage, null)
  assert.equal(mergedNotification.retryCount, 0)
})
