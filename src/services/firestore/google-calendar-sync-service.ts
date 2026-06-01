import { Timestamp, doc, writeBatch } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import { calendarEventSchema } from '@/types/firestore'
import type { CalendarEventDocument } from '@/types/firestore'

import { appendAuditLogToBatch } from './audit-logs-service'
import { getTypedDocument } from './shared'

type CalendarEventGoogleSyncFields = Pick<
  CalendarEventDocument,
  | 'googleCalendarSyncError'
  | 'googleCalendarSyncStatus'
  | 'googleCalendarSyncUpdatedAt'
  | 'googleCalendarManualSyncRequestedAt'
>

export type RequestManualGoogleCalendarSyncInput = {
  actorName?: string | null
  actorUid: string
  calendarEventId: string
}

export function buildPendingGoogleCalendarSyncFields(
  now: Timestamp,
): CalendarEventGoogleSyncFields {
  return {
    googleCalendarSyncError: null,
    googleCalendarManualSyncRequestedAt: null,
    googleCalendarSyncStatus: 'pending',
    googleCalendarSyncUpdatedAt: now,
  }
}

export function buildSyncedGoogleCalendarSyncFields(
  now: Timestamp,
): CalendarEventGoogleSyncFields {
  return {
    googleCalendarSyncError: null,
    googleCalendarManualSyncRequestedAt: null,
    googleCalendarSyncStatus: 'synced',
    googleCalendarSyncUpdatedAt: now,
  }
}

export async function requestManualGoogleCalendarSync({
  actorName,
  actorUid,
  calendarEventId,
}: RequestManualGoogleCalendarSyncInput) {
  const normalizedCalendarEventId = calendarEventId.trim()

  if (normalizedCalendarEventId.length === 0) {
    throw new Error('Selecione um evento valido para sincronizar com a agenda.')
  }

  const calendarEventRef = doc(firebaseDb, 'calendarEvents', normalizedCalendarEventId)
  const existingCalendarEvent = await getTypedDocument(
    calendarEventRef,
    calendarEventSchema,
  )

  if (!existingCalendarEvent || !existingCalendarEvent.isActive) {
    throw new Error('O evento vinculado a esta designacao nao esta mais ativo na agenda.')
  }

  const now = Timestamp.now()
  const batch = writeBatch(firebaseDb)

  batch.set(
    calendarEventRef,
    {
      googleCalendarManualSyncRequestedAt: now,
      googleCalendarSyncError: null,
      googleCalendarSyncStatus: 'pending',
      googleCalendarSyncUpdatedAt: now,
    },
    {
      merge: true,
    },
  )
  appendAuditLogToBatch(batch, {
    entityType: 'calendarEvent',
    entityId: existingCalendarEvent.id,
    action: 'sync',
    actorUid,
    actorName: actorName ?? null,
    before: {
      googleCalendarCalendarId: existingCalendarEvent.googleCalendarCalendarId ?? null,
      googleCalendarEventId: existingCalendarEvent.googleCalendarEventId ?? null,
      googleCalendarSyncStatus: existingCalendarEvent.googleCalendarSyncStatus ?? null,
    },
    after: {
      googleCalendarManualSyncRequestedAt: now,
      googleCalendarSyncStatus: 'pending',
    },
    metadata: {
      source: 'calendar-phase-12',
      trigger: 'manual-google-calendar-button',
    },
    createdAt: now,
  })

  await batch.commit()
}
