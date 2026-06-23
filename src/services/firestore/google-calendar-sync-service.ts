import { Timestamp, doc, writeBatch } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase-db'
import { calendarEventSchema } from '@/types/firestore'
import type { CalendarEventDocument } from '@/types/firestore'

import { appendAuditLogToBatch } from './audit-logs-service'
import { getTypedDocument } from './shared'

type CalendarEventGoogleSyncFields = Pick<
  CalendarEventDocument,
  | 'googleCalendarSyncError'
  | 'googleCalendarSyncStatus'
  | 'googleCalendarManualSyncRequestedAt'
  | 'googleCalendarClaimId'
  | 'googleCalendarClaimedAt'
  | 'googleCalendarRetryCount'
  | 'googleCalendarSyncScheduledFor'
> &
  Partial<Pick<CalendarEventDocument, 'googleCalendarSyncUpdatedAt'>>

export type RequestManualGoogleCalendarSyncInput = {
  actorName?: string | null
  actorUid: string
  calendarEventId: string
  trigger?: 'automatic-assignment-change' | 'manual-google-calendar-button'
}

export function buildPendingGoogleCalendarSyncFields(
  now: Timestamp,
): CalendarEventGoogleSyncFields {
  return {
    googleCalendarSyncError: null,
    googleCalendarManualSyncRequestedAt: null,
    googleCalendarSyncStatus: 'pending',
    googleCalendarClaimId: null,
    googleCalendarClaimedAt: null,
    googleCalendarRetryCount: 0,
    googleCalendarSyncScheduledFor: now,
  }
}

export function buildSyncedGoogleCalendarSyncFields(
  now: Timestamp,
): CalendarEventGoogleSyncFields {
  return {
    googleCalendarSyncError: null,
    googleCalendarManualSyncRequestedAt: null,
    googleCalendarSyncStatus: 'synced',
    googleCalendarClaimId: null,
    googleCalendarClaimedAt: null,
    googleCalendarRetryCount: 0,
    googleCalendarSyncScheduledFor: null,
    googleCalendarSyncUpdatedAt: now,
  }
}

export async function requestManualGoogleCalendarSync({
  actorName,
  actorUid,
  calendarEventId,
  trigger = 'manual-google-calendar-button',
}: RequestManualGoogleCalendarSyncInput) {
  const normalizedCalendarEventId = calendarEventId.trim()

  if (normalizedCalendarEventId.length === 0) {
    throw new Error('Selecione um evento valido para sincronizar com o Google Calendar.')
  }

  const calendarEventRef = doc(firebaseDb, 'calendarEvents', normalizedCalendarEventId)
  const existingCalendarEvent = await getTypedDocument(
    calendarEventRef,
    calendarEventSchema,
  )

  if (!existingCalendarEvent || !existingCalendarEvent.isActive) {
    throw new Error('O evento vinculado a esta designacao nao esta mais ativo no calendário.')
  }

  const now = Timestamp.now()
  const batch = writeBatch(firebaseDb)

  batch.set(
    calendarEventRef,
    {
      googleCalendarManualSyncRequestedAt: now,
      googleCalendarSyncError: null,
      googleCalendarSyncStatus: 'pending',
      googleCalendarClaimId: null,
      googleCalendarClaimedAt: null,
      googleCalendarRetryCount: 0,
      googleCalendarSyncScheduledFor: now,
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
      trigger,
    },
    createdAt: now,
  })

  await batch.commit()
}
