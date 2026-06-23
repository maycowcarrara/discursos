import {
  Timestamp,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase-db'
import {
  appSettingsSchema,
  calendarEventSchema,
  calendarSettingsSchema,
  type CalendarEventDocument,
  type AppSettingsDocument,
  type CalendarSettingsDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { appendAuditLogToBatch } from './audit-log-writes'
import { buildPendingGoogleCalendarSyncFields } from './google-calendar-sync-service'
import { getTypedDocument } from './shared'

export type AppSettingsFormValues = {
  defaultYear: number
}

export type SaveAppSettingsInput = AppSettingsFormValues & {
  actorUid: string
}

export type CalendarSettingsFormValues = {
  enabled: boolean
  autoSyncAssignmentsEnabled: boolean
  calendarId: string
  defaultStartTime: string
  defaultDurationMinutes: number
}

export type SaveCalendarSettingsInput = CalendarSettingsFormValues & {
  actorUid: string
  actorName?: string | null
}

const settingsCollectionName = 'settings'
const appSettingsDocId = 'app'
const calendarSettingsDocId = 'calendar'
const calendarQueueBatchSize = 450

export const defaultAppSettingsValues: AppSettingsFormValues = {
  defaultYear: new Date().getFullYear(),
}

export const defaultCalendarSettingsValues: CalendarSettingsFormValues = {
  enabled: false,
  autoSyncAssignmentsEnabled: false,
  calendarId: '',
  defaultStartTime: '19:30',
  defaultDurationMinutes: 90,
}

function getAppSettingsRef() {
  return doc(firebaseDb, settingsCollectionName, appSettingsDocId)
}

function getCalendarSettingsRef() {
  return doc(firebaseDb, settingsCollectionName, calendarSettingsDocId)
}

export async function getAppSettings(): Promise<FirestoreRecord<AppSettingsDocument> | null> {
  return getTypedDocument(getAppSettingsRef(), appSettingsSchema)
}

export async function getCalendarSettings(): Promise<
  FirestoreRecord<CalendarSettingsDocument> | null
> {
  return getTypedDocument(getCalendarSettingsRef(), calendarSettingsSchema)
}

export function toAppSettingsFormValues(
  settings: FirestoreRecord<AppSettingsDocument> | null | undefined,
): AppSettingsFormValues {
  if (!settings) {
    return defaultAppSettingsValues
  }

  return {
    defaultYear: settings.defaultYear,
  }
}

export function toCalendarSettingsFormValues(
  settings: FirestoreRecord<CalendarSettingsDocument> | null | undefined,
): CalendarSettingsFormValues {
  if (!settings) {
    return defaultCalendarSettingsValues
  }

  return {
    enabled: settings.enabled,
    autoSyncAssignmentsEnabled: settings.autoSyncAssignmentsEnabled,
    calendarId: settings.calendarId,
    defaultStartTime: settings.defaultStartTime,
    defaultDurationMinutes: settings.defaultDurationMinutes,
  }
}

function toCalendarSettingsAuditSnapshot(
  settings: FirestoreRecord<CalendarSettingsDocument> | CalendarSettingsDocument | null,
) {
  if (!settings) {
    return null
  }

  if ('id' in settings) {
    const { id, ...documentData } = settings
    void id

    return documentData
  }

  return settings
}

function shouldQueueFullCalendarSync(
  existingSettings: FirestoreRecord<CalendarSettingsDocument> | null,
  nextValues: CalendarSettingsFormValues,
) {
  if (!nextValues.enabled) {
    return false
  }

  if (!existingSettings) {
    return true
  }

  return (
    !existingSettings.enabled ||
    existingSettings.calendarId !== nextValues.calendarId.trim() ||
    existingSettings.defaultStartTime !== nextValues.defaultStartTime.trim() ||
    existingSettings.defaultDurationMinutes !== nextValues.defaultDurationMinutes
  )
}

function shouldQueueCalendarEventForConfigurationChange(
  calendarEvent: CalendarEventDocument,
) {
  return (
    (calendarEvent.type === 'special' && calendarEvent.isActive) ||
    Boolean(calendarEvent.googleCalendarEventId)
  )
}

function chunkItems<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

async function listCalendarEventsForConfigurationQueue() {
  const calendarEventsRef = collection(firebaseDb, 'calendarEvents')
  const [specialEventsSnapshot, remotelyLinkedEventsSnapshot] = await Promise.all([
    getDocs(query(calendarEventsRef, where('type', '==', 'special'))),
    getDocs(query(calendarEventsRef, where('googleCalendarEventId', '>', ''))),
  ])
  const queuedEventsById = new Map<string, ReturnType<typeof doc>>()
  const calendarEventSnapshots = [
    ...specialEventsSnapshot.docs,
    ...remotelyLinkedEventsSnapshot.docs,
  ]

  calendarEventSnapshots.forEach((calendarEventSnapshot) => {
    const parsedCalendarEvent = calendarEventSchema.safeParse({
      id: calendarEventSnapshot.id,
      ...calendarEventSnapshot.data(),
    })

    if (
      parsedCalendarEvent.success &&
      shouldQueueCalendarEventForConfigurationChange(parsedCalendarEvent.data)
    ) {
      queuedEventsById.set(calendarEventSnapshot.id, calendarEventSnapshot.ref)
    }
  })

  return Array.from(queuedEventsById.values()).map((ref) => ({ ref }))
}

export async function saveAppSettings({
  actorUid,
  defaultYear,
}: SaveAppSettingsInput) {
  const appSettingsRef = getAppSettingsRef()
  const existingSnapshot = await getDoc(appSettingsRef)
  const existingData = existingSnapshot.data()
  const now = serverTimestamp()

  await setDoc(
    appSettingsRef,
    {
      defaultYear,
      organizationName: deleteField(),
      locale: deleteField(),
      timezone: deleteField(),
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
      createdBy: existingData?.createdBy ?? actorUid,
      updatedBy: actorUid,
    },
    {
      merge: true,
    },
  )
}

export async function saveCalendarSettings({
  actorName,
  actorUid,
  autoSyncAssignmentsEnabled,
  calendarId,
  defaultDurationMinutes,
  defaultStartTime,
  enabled,
}: SaveCalendarSettingsInput) {
  const calendarSettingsRef = getCalendarSettingsRef()
  const existingSettings = await getCalendarSettings()
  const now = Timestamp.now()
  const nextCalendarSettings: CalendarSettingsDocument = {
    enabled,
    autoSyncAssignmentsEnabled,
    calendarId: calendarId.trim(),
    defaultStartTime: defaultStartTime.trim(),
    defaultDurationMinutes,
    configurationUpdatedAt: now,
    lastSyncAt: existingSettings?.lastSyncAt ?? null,
    lastSyncStatus: existingSettings?.lastSyncStatus ?? 'idle',
    lastSyncMessage: existingSettings?.lastSyncMessage ?? null,
    createdAt: existingSettings?.createdAt ?? now,
    updatedAt: now,
    createdBy: existingSettings?.createdBy ?? actorUid,
    updatedBy: actorUid,
  }
  const queueFullSync = shouldQueueFullCalendarSync(existingSettings, {
    enabled,
    autoSyncAssignmentsEnabled,
    calendarId,
    defaultStartTime,
    defaultDurationMinutes,
  })
  const calendarEventsToQueue: Array<{
    ref: ReturnType<typeof doc>
  }> = []
  if (queueFullSync) {
    calendarEventsToQueue.push(...(await listCalendarEventsForConfigurationQueue()))
  }

  const batch = writeBatch(firebaseDb)

  batch.set(calendarSettingsRef, nextCalendarSettings)
  appendAuditLogToBatch(batch, {
    entityType: 'settings',
    entityId: calendarSettingsDocId,
    action: existingSettings ? 'update' : 'create',
    actorUid,
    actorName: actorName ?? null,
    before: toCalendarSettingsAuditSnapshot(existingSettings),
    after: toCalendarSettingsAuditSnapshot(nextCalendarSettings),
    metadata: {
      source: 'settings-phase-12',
      queueFullSync,
      queuedCalendarEventCount: calendarEventsToQueue.length,
    },
    createdAt: now,
  })

  await batch.commit()

  for (const calendarEventsChunk of chunkItems(
    calendarEventsToQueue,
    calendarQueueBatchSize,
  )) {
    const calendarEventsBatch = writeBatch(firebaseDb)

    calendarEventsChunk.forEach((calendarEvent) => {
      calendarEventsBatch.set(
        calendarEvent.ref,
        buildPendingGoogleCalendarSyncFields(now),
        { merge: true },
      )
    })

    await calendarEventsBatch.commit()
  }
}
