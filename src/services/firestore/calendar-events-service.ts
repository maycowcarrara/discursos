import {
  Timestamp,
  collection,
  doc,
  limit,
  orderBy,
  query,
  runTransaction,
  where,
  writeBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  assignmentSchema,
  calendarEventSchema,
  type CalendarEventDocument,
  type CalendarEventType,
  type FirestoreRecord,
  congregationSchema,
} from '@/types/firestore'
import {
  calendarEventDefaultTitles,
  formatDateInputValue,
  getBlocksAssignmentsForEventType,
  listSaturdayDateValuesForYear,
  parseDateInputValue,
  toLocalDateKey,
} from '@/utils/calendar-events'

import { appendAuditLogToBatch } from './audit-logs-service'
import { getTypedCollection, getTypedDocument } from './shared'

export type CalendarEventFormValues = {
  date: string
  type: CalendarEventType
  title: string
  description: string
  congregationId: string
  isActive: boolean
}

export type CreateCalendarEventInput = CalendarEventFormValues & {
  actorUid: string
  actorName?: string | null
  targetYear: number
}

export type UpdateCalendarEventInput = CreateCalendarEventInput & {
  id: string
}

export type DeleteCalendarEventInput = {
  id: string
  actorUid: string
  actorName?: string | null
}

export type GenerateCalendarYearInput = {
  year: number
  actorUid: string
  actorName?: string | null
}

export const defaultCalendarEventFormValues: CalendarEventFormValues = {
  date: '',
  type: 'publicTalk',
  title: calendarEventDefaultTitles.publicTalk,
  description: '',
  congregationId: '',
  isActive: true,
}

type CalendarEventWritePayload = Omit<
  CalendarEventDocument,
  'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>

function getCalendarEventsCollection() {
  return collection(firebaseDb, 'calendarEvents')
}

function getCalendarEventRef(id: string) {
  return doc(firebaseDb, 'calendarEvents', id)
}

function getActiveCalendarEventDocumentId(dateKey: string) {
  return `active-${dateKey}`
}

function getActiveCalendarEventRef(dateKey: string) {
  return getCalendarEventRef(getActiveCalendarEventDocumentId(dateKey))
}

function buildAuditLogDocument(
  payload: Parameters<typeof appendAuditLogToBatch>[1],
) {
  return {
    ...payload,
    createdAt: payload.createdAt ?? Timestamp.now(),
  }
}

function stripRecordId(
  calendarEvent: FirestoreRecord<CalendarEventDocument>,
): CalendarEventDocument {
  const { id, ...documentData } = calendarEvent
  void id

  return documentData
}

function toAuditSnapshot(
  calendarEvent: FirestoreRecord<CalendarEventDocument> | CalendarEventDocument,
): Record<string, unknown> {
  if ('id' in calendarEvent) {
    return stripRecordId(calendarEvent)
  }

  return { ...calendarEvent }
}

async function resolveCongregationSnapshot(congregationId: string) {
  const trimmedCongregationId = congregationId.trim()

  if (trimmedCongregationId.length === 0) {
    return null
  }

  const congregationRef = doc(firebaseDb, 'congregations', trimmedCongregationId)
  const congregation = await getTypedDocument(congregationRef, congregationSchema)

  if (!congregation || !congregation.isActive) {
    throw new Error('A congregacao selecionada nao esta disponivel na base ativa.')
  }

  return {
    congregationId: congregation.id,
    congregationName: congregation.name,
  }
}

async function listCalendarEventsForYear(
  year: number,
): Promise<Array<FirestoreRecord<CalendarEventDocument>>> {
  const calendarEventsQuery = query(
    getCalendarEventsCollection(),
    where('year', '==', year),
    orderBy('date', 'asc'),
  )

  return getTypedCollection(calendarEventsQuery, calendarEventSchema)
}

async function assertActiveDateIsAvailable(
  year: number,
  dateKey: string,
  excludeId?: string,
) {
  const events = await listCalendarEventsForYear(year)
  const conflictingEvent = events.find(
    (event) =>
      event.isActive &&
      event.id !== excludeId &&
      toLocalDateKey(event.date) === dateKey,
  )

  if (conflictingEvent) {
    throw new Error(
      `Ja existe um evento ativo em ${dateKey}. Edite o registro atual em vez de criar outro.`,
    )
  }
}

async function getAssignmentCountByCalendarEventId(calendarEventId: string) {
  const assignmentsQuery = query(
    collection(firebaseDb, 'assignments'),
    where('calendarEventId', '==', calendarEventId),
    limit(500),
  )
  const assignments = await getTypedCollection(assignmentsQuery, assignmentSchema)

  return assignments.length
}

function assertCalendarEventMatchesTargetYear(
  targetYear: number,
  calendarEvent: CalendarEventWritePayload,
) {
  if (calendarEvent.year !== targetYear) {
    throw new Error(
      `Use uma data dentro de ${targetYear} para manter a agenda no ano correto.`,
    )
  }
}

function buildCalendarEventPayload(
  values: CalendarEventFormValues,
  congregation: Awaited<ReturnType<typeof resolveCongregationSnapshot>>,
): CalendarEventWritePayload {
  const parsedDate = parseDateInputValue(values.date)
  const date = Timestamp.fromDate(parsedDate)
  const trimmedTitle = values.title.trim()
  const trimmedDescription = values.description.trim()

  const payload: CalendarEventWritePayload = {
    year: parsedDate.getFullYear(),
    date,
    type: values.type,
    title: trimmedTitle,
    congregationId: congregation?.congregationId ?? null,
    congregationName: congregation?.congregationName ?? null,
    blocksAssignments: getBlocksAssignmentsForEventType(values.type),
    isActive: values.isActive,
  }

  if (trimmedDescription.length > 0) {
    payload.description = trimmedDescription
  }

  return payload
}

export function toCalendarEventFormValues(
  calendarEvent: FirestoreRecord<CalendarEventDocument> | null | undefined,
): CalendarEventFormValues {
  if (!calendarEvent) {
    return defaultCalendarEventFormValues
  }

  return {
    date: formatDateInputValue(calendarEvent.date),
    type: calendarEvent.type,
    title: calendarEvent.title,
    description: calendarEvent.description ?? '',
    congregationId: calendarEvent.congregationId ?? '',
    isActive: calendarEvent.isActive,
  }
}

export async function listCalendarEventsByYear(
  year: number,
): Promise<Array<FirestoreRecord<CalendarEventDocument>>> {
  const calendarEvents = await listCalendarEventsForYear(year)

  return calendarEvents.filter((event) => event.isActive)
}

export async function listCalendarEventsByYearForManagement(
  year: number,
): Promise<Array<FirestoreRecord<CalendarEventDocument>>> {
  return listCalendarEventsForYear(year)
}

export async function createCalendarEvent({
  actorName,
  actorUid,
  targetYear,
  ...values
}: CreateCalendarEventInput) {
  const congregation = await resolveCongregationSnapshot(values.congregationId)
  const payload = buildCalendarEventPayload(values, congregation)
  const dateKey = toLocalDateKey(payload.date)

  assertCalendarEventMatchesTargetYear(targetYear, payload)

  if (payload.isActive) {
    await assertActiveDateIsAvailable(payload.year, dateKey)
  }

  const now = Timestamp.now()
  const calendarEventRef = payload.isActive
    ? getActiveCalendarEventRef(dateKey)
    : doc(getCalendarEventsCollection())
  const calendarEventDocument: CalendarEventDocument = {
    ...payload,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
    updatedBy: actorUid,
  }
  if (payload.isActive) {
    await runTransaction(firebaseDb, async (transaction) => {
      const existingSnapshot = await transaction.get(calendarEventRef)

      if (existingSnapshot.exists()) {
        throw new Error(
          `Ja existe um evento ativo em ${dateKey}. Edite o registro atual em vez de criar outro.`,
        )
      }

      const auditLogRef = doc(collection(firebaseDb, 'auditLogs'))

      transaction.set(calendarEventRef, calendarEventDocument)
      transaction.set(
        auditLogRef,
        buildAuditLogDocument({
          entityType: 'calendarEvent',
          entityId: calendarEventRef.id,
          action: 'create',
          actorUid,
          actorName: actorName ?? null,
          before: null,
          after: toAuditSnapshot(calendarEventDocument),
          metadata: {
            source: 'calendar-phase-7',
          },
          createdAt: now,
        }),
      )
    })

    return
  }

  const batch = writeBatch(firebaseDb)

  batch.set(calendarEventRef, calendarEventDocument)
  appendAuditLogToBatch(batch, {
    entityType: 'calendarEvent',
    entityId: calendarEventRef.id,
    action: 'create',
    actorUid,
    actorName: actorName ?? null,
    before: null,
    after: toAuditSnapshot(calendarEventDocument),
    metadata: {
      source: 'calendar-phase-7',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function updateCalendarEvent({
  id,
  actorName,
  actorUid,
  targetYear,
  ...values
}: UpdateCalendarEventInput) {
  const calendarEventRef = getCalendarEventRef(id)
  const existingCalendarEvent = await getTypedDocument(
    calendarEventRef,
    calendarEventSchema,
  )

  if (!existingCalendarEvent) {
    throw new Error('O evento selecionado nao foi encontrado.')
  }

  const assignmentCount = await getAssignmentCountByCalendarEventId(id)
  const congregation = await resolveCongregationSnapshot(values.congregationId)
  const payload = buildCalendarEventPayload(values, congregation)
  const nextDateKey = toLocalDateKey(payload.date)
  const previousDateKey = toLocalDateKey(existingCalendarEvent.date)
  const isTypeChanging = existingCalendarEvent.type !== payload.type
  const isDateChanging = previousDateKey !== nextDateKey
  const isReactivating = !existingCalendarEvent.isActive && payload.isActive
  const nextCalendarEventRef = payload.isActive
    ? getActiveCalendarEventRef(nextDateKey)
    : calendarEventRef

  assertCalendarEventMatchesTargetYear(targetYear, payload)

  if (assignmentCount > 0 && isDateChanging) {
    throw new Error(
      'Este evento ja possui designacoes vinculadas. A data nao pode ser alterada nesta fase.',
    )
  }

  if (
    assignmentCount > 0 &&
    getBlocksAssignmentsForEventType(payload.type) &&
    !existingCalendarEvent.blocksAssignments
  ) {
    throw new Error(
      'Este evento ja possui designacoes vinculadas e nao pode virar bloqueio oficial agora.',
    )
  }

  if (assignmentCount > 0 && isTypeChanging && existingCalendarEvent.type !== payload.type) {
    throw new Error(
      'Este evento ja possui designacoes vinculadas. O tipo operacional deve permanecer igual nesta fase.',
    )
  }

  if (payload.isActive || isReactivating) {
    await assertActiveDateIsAvailable(payload.year, nextDateKey, id)
  }

  const now = Timestamp.now()
  const updatedCalendarEvent: CalendarEventDocument = {
    ...stripRecordId(existingCalendarEvent),
    ...payload,
    updatedAt: now,
    updatedBy: actorUid,
  }

  if (nextCalendarEventRef.id !== calendarEventRef.id) {
    await runTransaction(firebaseDb, async (transaction) => {
      const targetSnapshot = await transaction.get(nextCalendarEventRef)

      if (targetSnapshot.exists()) {
        throw new Error(
          `Ja existe um evento ativo em ${nextDateKey}. Edite o registro atual em vez de criar outro.`,
        )
      }

      const auditLogRef = doc(collection(firebaseDb, 'auditLogs'))

      transaction.set(nextCalendarEventRef, updatedCalendarEvent)
      transaction.delete(calendarEventRef)
      transaction.set(
        auditLogRef,
        buildAuditLogDocument({
          entityType: 'calendarEvent',
          entityId: nextCalendarEventRef.id,
          action: 'update',
          actorUid,
          actorName: actorName ?? null,
          before: toAuditSnapshot(existingCalendarEvent),
          after: toAuditSnapshot(updatedCalendarEvent),
          metadata: {
            source: 'calendar-phase-7',
            assignmentCount,
            previousEntityId: id,
            migratedEntityId: nextCalendarEventRef.id,
          },
          createdAt: now,
        }),
      )
    })

    return
  }

  const batch = writeBatch(firebaseDb)

  batch.set(calendarEventRef, updatedCalendarEvent)
  appendAuditLogToBatch(batch, {
    entityType: 'calendarEvent',
    entityId: id,
    action: 'update',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingCalendarEvent),
    after: toAuditSnapshot(updatedCalendarEvent),
    metadata: {
      source: 'calendar-phase-7',
      assignmentCount,
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function deleteCalendarEvent({
  id,
  actorName,
  actorUid,
}: DeleteCalendarEventInput) {
  const calendarEventRef = getCalendarEventRef(id)
  const existingCalendarEvent = await getTypedDocument(
    calendarEventRef,
    calendarEventSchema,
  )

  if (!existingCalendarEvent || !existingCalendarEvent.isActive) {
    throw new Error('O evento selecionado nao esta mais ativo na agenda.')
  }

  const assignmentCount = await getAssignmentCountByCalendarEventId(id)

  if (assignmentCount > 0) {
    throw new Error(
      'Este evento ja possui designacoes vinculadas e nao pode ser arquivado nesta fase.',
    )
  }

  const now = Timestamp.now()
  const archivedCalendarEvent: CalendarEventDocument = {
    ...stripRecordId(existingCalendarEvent),
    isActive: false,
    updatedAt: now,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(calendarEventRef, archivedCalendarEvent)
  appendAuditLogToBatch(batch, {
    entityType: 'calendarEvent',
    entityId: id,
    action: 'delete',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingCalendarEvent),
    after: toAuditSnapshot(archivedCalendarEvent),
    metadata: {
      source: 'calendar-phase-7',
      strategy: 'soft-delete',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function generateCalendarYear({
  year,
  actorName,
  actorUid,
}: GenerateCalendarYearInput) {
  const existingEvents = await listCalendarEventsByYear(year)
  const activeDateKeys = new Set(existingEvents.map((event) => toLocalDateKey(event.date)))
  const saturdayDates = listSaturdayDateValuesForYear(year)
  const missingSaturdayDates = saturdayDates.filter(
    (dateValue) => !activeDateKeys.has(dateValue),
  )

  if (missingSaturdayDates.length === 0) {
    return {
      createdCount: 0,
      skippedCount: saturdayDates.length,
    }
  }

  const now = Timestamp.now()
  let createdCount = 0

  await runTransaction(firebaseDb, async (transaction) => {
    for (const dateValue of missingSaturdayDates) {
      const calendarEventRef = getActiveCalendarEventRef(dateValue)
      const existingSnapshot = await transaction.get(calendarEventRef)

      if (existingSnapshot.exists()) {
        continue
      }

      const date = Timestamp.fromDate(parseDateInputValue(dateValue))
      const calendarEventDocument: CalendarEventDocument = {
        year,
        date,
        type: 'publicTalk',
        title: calendarEventDefaultTitles.publicTalk,
        congregationId: null,
        congregationName: null,
        blocksAssignments: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: actorUid,
        updatedBy: actorUid,
      }
      const auditLogRef = doc(collection(firebaseDb, 'auditLogs'))

      transaction.set(calendarEventRef, calendarEventDocument)
      transaction.set(
        auditLogRef,
        buildAuditLogDocument({
          entityType: 'calendarEvent',
          entityId: calendarEventRef.id,
          action: 'create',
          actorUid,
          actorName: actorName ?? null,
          before: null,
          after: toAuditSnapshot(calendarEventDocument),
          metadata: {
            source: 'calendar-phase-7',
            strategy: 'auto-saturday-generation',
          },
          createdAt: now,
        }),
      )

      createdCount += 1
    }
  })

  return {
    createdCount,
    skippedCount: saturdayDates.length - createdCount,
  }
}
