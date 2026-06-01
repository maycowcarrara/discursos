import {
  Timestamp,
  getDoc,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
  type Transaction,
  runTransaction,
  collection,
  doc,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  writeBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase-db'
import {
  assignmentSchema,
  calendarEventSchema,
  congregationSchema,
  notificationSchema,
  speakerSchema,
  themeSchema,
  type AssignmentDocument,
  type AssignmentStatus,
  type CalendarEventDocument,
  type CongregationDocument,
  type FirestoreRecord,
  type NotificationDocument,
  type SpeakerDocument,
  type ThemeDocument,
} from '@/types/firestore'
import { buildAssignmentNotificationPlan } from '@/utils/assignment-notifications'
import {
  isAssignmentCoveringCalendarSlot,
  toLocalDateKey,
} from '@/utils/calendar-events'
import { mergeNotificationDocumentForSync } from '@/utils/notification-sync'

import { appendAuditLogToBatch } from './audit-logs-service'
import {
  buildImplicitCalendarEventFromId,
  buildMaterializedImplicitPublicTalkDocument,
} from './calendar-slots-service'
import { getTypedCollection, getTypedDocument } from './shared'

export type AssignmentFormValues = {
  calendarEventId: string
  localCongregationId: string
  speakerId: string
  themeId: string
  status: AssignmentStatus
  notes: string
}

export type CreateAssignmentInput = AssignmentFormValues & {
  actorUid: string
  actorName?: string | null
}

export type UpdateAssignmentInput = CreateAssignmentInput & {
  id: string
}

export type ConfirmAssignmentInput = {
  id: string
  actorUid: string
  actorName?: string | null
}

export type ListAssignmentHistoryInput = {
  periodStart?: string | null
  periodEnd?: string | null
}

export type AssignmentHistoryCursor = QueryDocumentSnapshot<DocumentData>

export type ListAssignmentHistoryPageInput = ListAssignmentHistoryInput & {
  cursor?: AssignmentHistoryCursor | null
  pageSize?: number
}

export type AssignmentHistoryPage = {
  items: Array<FirestoreRecord<AssignmentDocument>>
  nextCursor: AssignmentHistoryCursor | null
  hasMore: boolean
}

const defaultAssignmentHistoryPageSize = 40

export const defaultAssignmentFormValues: AssignmentFormValues = {
  calendarEventId: '',
  localCongregationId: '',
  speakerId: '',
  themeId: '',
  status: 'pending',
  notes: '',
}

type ResolvedAssignmentEntities = {
  calendarEvent: FirestoreRecord<CalendarEventDocument>
  localCongregation: FirestoreRecord<CongregationDocument>
  originCongregation: FirestoreRecord<CongregationDocument>
  speaker: FirestoreRecord<SpeakerDocument>
  theme: FirestoreRecord<ThemeDocument>
}

function getAssignmentsCollection() {
  return collection(firebaseDb, 'assignments')
}

function getAssignmentRef(id: string) {
  return doc(firebaseDb, 'assignments', id)
}

function getNotificationRef(id: string) {
  return doc(firebaseDb, 'notifications', id)
}

function getCalendarEventRef(id: string) {
  return doc(firebaseDb, 'calendarEvents', id)
}

async function resolveOrganizationName() {
  const localCongregations = await getTypedCollection(
    query(
      collection(firebaseDb, 'congregations'),
      where('isLocal', '==', true),
      where('isActive', '==', true),
      limit(1),
    ),
    congregationSchema,
  )

  const localCongregationName = localCongregations[0]?.name.trim()

  if (localCongregationName) {
    return localCongregationName
  }

  const legacySettingsSnapshot = await getDoc(doc(firebaseDb, 'settings', 'app'))
  const legacyOrganizationName = legacySettingsSnapshot.data()?.organizationName

  if (
    typeof legacyOrganizationName === 'string' &&
    legacyOrganizationName.trim().length > 0
  ) {
    return legacyOrganizationName.trim()
  }

  return 'Congregacao local'
}

function parseDateBoundaryValue(value: string) {
  const [yearValue, monthValue, dayValue] = value.split('-')
  const year = Number.parseInt(yearValue ?? '', 10)
  const month = Number.parseInt(monthValue ?? '', 10)
  const day = Number.parseInt(dayValue ?? '', 10)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error('Informe um periodo valido para consultar o historico.')
  }

  const parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0)

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new Error('Informe um periodo valido para consultar o historico.')
  }

  return parsedDate
}

function toPeriodStartTimestamp(value: string) {
  const parsedDate = parseDateBoundaryValue(value)

  return Timestamp.fromDate(
    new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      0,
      0,
      0,
      0,
    ),
  )
}

function toPeriodEndExclusiveTimestamp(value: string) {
  const parsedDate = parseDateBoundaryValue(value)

  return Timestamp.fromDate(
    new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate() + 1,
      0,
      0,
      0,
      0,
    ),
  )
}

function stripRecordId(
  assignment: FirestoreRecord<AssignmentDocument>,
): AssignmentDocument {
  const { id, ...documentData } = assignment
  void id

  return documentData
}

function toAuditSnapshot(
  assignment: FirestoreRecord<AssignmentDocument> | AssignmentDocument,
): Record<string, unknown> {
  if ('id' in assignment) {
    return stripRecordId(assignment)
  }

  return { ...assignment }
}

function getUnavailableWindowLabel(
  unavailableStart: Timestamp | null | undefined,
  unavailableEnd: Timestamp | null | undefined,
) {
  if (!unavailableStart || !unavailableEnd) {
    return 'sem intervalo valido cadastrado'
  }

  const startLabel = unavailableStart.toDate().toLocaleDateString('pt-BR')
  const endLabel = unavailableEnd.toDate().toLocaleDateString('pt-BR')

  return `${startLabel} ate ${endLabel}`
}

function buildStatusFields(
  status: AssignmentStatus,
  now: Timestamp,
  existingAssignment?: FirestoreRecord<AssignmentDocument> | null,
) {
  if (status === 'pending') {
    return {
      confirmedAt: null,
      responseAt: null,
    }
  }

  if (status === 'confirmed') {
    return {
      confirmedAt: existingAssignment?.confirmedAt ?? now,
      responseAt: now,
    }
  }

  return {
    confirmedAt: null,
    responseAt: now,
  }
}

function buildAssignmentPayload(
  values: AssignmentFormValues,
  entities: ResolvedAssignmentEntities,
  now: Timestamp,
  existingAssignment?: FirestoreRecord<AssignmentDocument> | null,
): Omit<AssignmentDocument, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {
  const statusFields = buildStatusFields(values.status, now, existingAssignment)

  return {
    calendarEventId: entities.calendarEvent.id,
    eventDate: entities.calendarEvent.date,
    eventType: entities.calendarEvent.type,
    localCongregationId: entities.localCongregation.id,
    localCongregationName: entities.localCongregation.name,
    speakerId: entities.speaker.id,
    speakerName: entities.speaker.name,
    speakerType: entities.speaker.type,
    originCongregationId: entities.originCongregation.id,
    originCongregationName: entities.originCongregation.name,
    themeId: entities.theme.id,
    themeNumber: entities.theme.number,
    themeTitle: entities.theme.title,
    status: values.status,
    notes: values.notes.trim(),
    confirmationToken: isAssignmentCoveringCalendarSlot(values.status)
      ? existingAssignment?.confirmationToken ?? crypto.randomUUID()
      : null,
    confirmedAt: statusFields.confirmedAt,
    responseAt: statusFields.responseAt,
  }
}

function buildNotificationDocuments(options: {
  assignment: Pick<
    AssignmentDocument,
    'eventDate' | 'status' | 'speakerId' | 'createdAt'
  > & {
    id: string
  }
  organizationName: string
  recipientEmail: string
  speakerName: string
  now: Timestamp
}) {
  const notificationPlan = buildAssignmentNotificationPlan({
    assignmentId: options.assignment.id,
    eventDate: options.assignment.eventDate.toDate(),
    status: options.assignment.status,
    recipient: {
      email: options.recipientEmail,
      speakerName: options.speakerName,
    },
    organizationName: options.organizationName,
    now: options.now.toDate(),
  })

  return notificationPlan.map((notification) => ({
    id: notification.documentId,
    document: {
      type: notification.type,
      channel: 'email' as const,
      assignmentId: options.assignment.id,
      speakerId: options.assignment.speakerId,
      recipientEmail: notification.recipientEmail,
      subject: notification.subject,
      status: notification.status,
      scheduledFor: Timestamp.fromDate(notification.scheduledFor),
      sentAt: null,
      errorMessage: null,
      retryCount: 0,
      provider: 'emailjs' as const,
      createdAt: options.assignment.createdAt,
      updatedAt: options.now,
    },
  }))
}

type NotificationSyncDocument = ReturnType<typeof buildNotificationDocuments>[number]

function mergeNotificationSyncDocuments(
  notificationDocuments: NotificationSyncDocument[],
  existingNotificationsById: Map<string, NotificationDocument>,
) {
  return notificationDocuments.map((notification) => ({
    ...notification,
    document: mergeNotificationDocumentForSync(
      existingNotificationsById.get(notification.id) ?? null,
      notification.document,
    ),
  }))
}

async function loadExistingNotificationDocuments(
  notificationIds: string[],
): Promise<Map<string, NotificationDocument>> {
  const existingNotifications = await Promise.all(
    notificationIds.map(async (notificationId) => {
      const existingNotification = await getTypedDocument(
        getNotificationRef(notificationId),
        notificationSchema,
      )

      return [notificationId, existingNotification] as const
    }),
  )

  return new Map(
    existingNotifications.flatMap(([notificationId, existingNotification]) =>
      existingNotification ? [[notificationId, existingNotification]] : [],
    ),
  )
}

async function syncNotificationDocumentsInTransaction(
  transaction: Transaction,
  notificationDocuments: ReturnType<typeof buildNotificationDocuments>,
) {
  const existingNotifications = await Promise.all(
    notificationDocuments.map(async (notification) => {
      const notificationSnapshot = await transaction.get(getNotificationRef(notification.id))

      if (!notificationSnapshot.exists()) {
        return [notification.id, null] as const
      }

      return [
        notification.id,
        notificationSchema.parse(notificationSnapshot.data()),
      ] as const
    }),
  )
  const existingNotificationsById = new Map(
    existingNotifications.flatMap(([notificationId, existingNotification]) =>
      existingNotification ? [[notificationId, existingNotification]] : [],
    ),
  )

  mergeNotificationSyncDocuments(
    notificationDocuments,
    existingNotificationsById,
  ).forEach((notification) => {
    transaction.set(getNotificationRef(notification.id), notification.document)
  })
}

async function syncNotificationDocumentsInBatch(
  batch: ReturnType<typeof writeBatch>,
  notificationDocuments: ReturnType<typeof buildNotificationDocuments>,
) {
  const existingNotificationsById = await loadExistingNotificationDocuments(
    notificationDocuments.map((notification) => notification.id),
  )

  mergeNotificationSyncDocuments(
    notificationDocuments,
    existingNotificationsById,
  ).forEach((notification) => {
    batch.set(getNotificationRef(notification.id), notification.document)
  })
}

function cancelConfirmationNotificationInTransaction(
  transaction: Transaction,
  assignmentId: string,
  now: Timestamp,
) {
  cancelAutomatedNotificationsInTransaction(transaction, assignmentId, now, [
    'confirmation',
  ])
}

function cancelAutomatedNotificationsInTransaction(
  transaction: Transaction,
  assignmentId: string,
  now: Timestamp,
  types: Array<'confirmation' | 'reminder7d' | 'reminder1d'> = [
    'confirmation',
    'reminder7d',
    'reminder1d',
  ],
) {
  types.forEach((type) => {
    transaction.set(
      getNotificationRef(`${assignmentId}__${type}`),
      {
        status: 'cancelled',
        scheduledFor: now,
        updatedAt: now,
      },
      { merge: true },
    )
  })
}

function buildExistingAssignmentStatusUpdate(
  assignment: FirestoreRecord<AssignmentDocument>,
  status: AssignmentStatus,
  notes: string,
  now: Timestamp,
  actorUid: string,
) {
  const statusFields = buildStatusFields(status, now, assignment)

  return {
    ...stripRecordId(assignment),
    status,
    notes: notes.trim(),
    confirmationToken: isAssignmentCoveringCalendarSlot(status)
      ? assignment.confirmationToken ?? crypto.randomUUID()
      : null,
    confirmedAt: statusFields.confirmedAt,
    responseAt: statusFields.responseAt,
    updatedAt: now,
    updatedBy: actorUid,
  }
}

async function assertActiveCongregationExists(id: string) {
  const congregation = await getTypedDocument(
    doc(firebaseDb, 'congregations', id),
    congregationSchema,
  )

  if (!congregation || !congregation.isActive) {
    throw new Error('A congregacao selecionada nao esta disponivel na base ativa.')
  }

  return congregation
}

async function assertActiveThemeExists(id: string) {
  const theme = await getTypedDocument(doc(firebaseDb, 'themes', id), themeSchema)

  if (!theme || !theme.isActive) {
    throw new Error('O tema selecionado nao esta mais disponivel na base ativa.')
  }

  return theme
}

async function assertSpeakerExists(id: string) {
  const speaker = await getTypedDocument(doc(firebaseDb, 'speakers', id), speakerSchema)

  if (!speaker) {
    throw new Error('O orador selecionado nao foi encontrado.')
  }

  if (!speaker.isActive || speaker.status === 'inactive' || speaker.status === 'transferred') {
    throw new Error('O orador selecionado nao esta disponivel para novas designacoes.')
  }

  return speaker
}

async function getSpeakerForNotifications(id: string) {
  const speaker = await getTypedDocument(doc(firebaseDb, 'speakers', id), speakerSchema)

  if (!speaker) {
    throw new Error('O orador vinculado a esta designacao nao foi encontrado.')
  }

  return speaker
}

async function assertCalendarEventExists(id: string) {
  const calendarEvent = await getTypedDocument(getCalendarEventRef(id), calendarEventSchema)

  if (calendarEvent?.isActive) {
    if (calendarEvent.blocksAssignments) {
      throw new Error(
        'Este evento bloqueia designacoes oficialmente. Escolha um sabado ou evento liberado.',
      )
    }

    return calendarEvent
  }

  const implicitCalendarEvent = buildImplicitCalendarEventFromId(id)

  if (!implicitCalendarEvent) {
    throw new Error('O evento selecionado nao esta mais disponivel na agenda ativa.')
  }

  return implicitCalendarEvent
}

function assertThemeBelongsToSpeaker(
  speaker: FirestoreRecord<SpeakerDocument>,
  theme: FirestoreRecord<ThemeDocument>,
) {
  if (!speaker.themeIds.includes(theme.id)) {
    throw new Error('RN001: o tema selecionado nao pertence ao cadastro deste orador.')
  }
}

function assertSpeakerAvailability(
  speaker: FirestoreRecord<SpeakerDocument>,
  eventDate: Timestamp,
) {
  if (speaker.status !== 'vacation' && speaker.status !== 'unavailable') {
    return
  }

  if (!speaker.unavailableStart || !speaker.unavailableEnd) {
    throw new Error(
      'O orador esta marcado como indisponivel, mas o periodo cadastrado precisa ser revisado antes da designacao.',
    )
  }

  const eventDateKey = toLocalDateKey(eventDate)
  const unavailableStartKey = toLocalDateKey(speaker.unavailableStart)
  const unavailableEndKey = toLocalDateKey(speaker.unavailableEnd)

  if (unavailableStartKey > unavailableEndKey) {
    throw new Error(
      'O periodo de indisponibilidade do orador esta invertido e precisa ser corrigido no cadastro.',
    )
  }

  if (
    eventDateKey >= unavailableStartKey &&
    eventDateKey <= unavailableEndKey
  ) {
    throw new Error(
      `RN006: ${speaker.name} esta indisponivel em ${getUnavailableWindowLabel(
        speaker.unavailableStart,
        speaker.unavailableEnd,
      )}.`,
    )
  }
}

async function resolveAssignmentEntities(values: AssignmentFormValues) {
  const [calendarEvent, localCongregation, speaker, theme] = await Promise.all([
    assertCalendarEventExists(values.calendarEventId.trim()),
    assertActiveCongregationExists(values.localCongregationId.trim()),
    assertSpeakerExists(values.speakerId.trim()),
    assertActiveThemeExists(values.themeId.trim()),
  ])
  const originCongregation = await assertActiveCongregationExists(
    speaker.congregationId,
  )

  assertThemeBelongsToSpeaker(speaker, theme)
  assertSpeakerAvailability(speaker, calendarEvent.date)

  return {
    calendarEvent,
    localCongregation,
    originCongregation,
    speaker,
    theme,
  }
}

function getOperationalAssignments(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
  excludeId?: string,
) {
  return assignments.filter(
    (assignment) =>
      assignment.id !== excludeId && isAssignmentCoveringCalendarSlot(assignment.status),
  )
}

function assertCalendarEventAllowsAssignments(
  calendarEvent: FirestoreRecord<CalendarEventDocument>,
) {
  if (!calendarEvent.isActive) {
    throw new Error('O evento selecionado nao esta mais disponivel na agenda ativa.')
  }

  if (calendarEvent.blocksAssignments) {
    throw new Error(
      'Este evento bloqueia designacoes oficialmente. Escolha um sabado ou evento liberado.',
    )
  }
}

async function runAssignmentSlotTransaction(options: {
  actorUid: string
  calendarEventId: string
  execute: (context: {
    currentAssignments: Array<FirestoreRecord<AssignmentDocument>>
    now: Timestamp
    transaction: Transaction
  }) => Promise<void> | void
}) {
  await runTransaction(firebaseDb, async (transaction) => {
    const calendarEventRef = getCalendarEventRef(options.calendarEventId)
    const calendarEventSnapshot = await transaction.get(calendarEventRef)
    const lockedCalendarEvent = calendarEventSnapshot.exists()
      ? ({
          id: calendarEventSnapshot.id,
          ...calendarEventSchema.parse(calendarEventSnapshot.data()),
        } satisfies FirestoreRecord<CalendarEventDocument>)
      : buildImplicitCalendarEventFromId(options.calendarEventId)

    if (!lockedCalendarEvent) {
      throw new Error('O evento selecionado nao esta mais disponivel na agenda ativa.')
    }

    assertCalendarEventAllowsAssignments(lockedCalendarEvent)

    const currentAssignments = await getTypedCollection(
      query(
        getAssignmentsCollection(),
        where('calendarEventId', '==', options.calendarEventId),
        limit(50),
      ),
      assignmentSchema,
    )
    const now = Timestamp.now()

    await options.execute({
      currentAssignments,
      now,
      transaction,
    })

    if (calendarEventSnapshot.exists()) {
      // Touch the event document with a merge-only write so concurrent slot mutations retry
      // without overwriting sync fields that may have been queued in this transaction.
      transaction.set(
        calendarEventRef,
        {
          updatedAt: lockedCalendarEvent.updatedAt,
        },
        { merge: true },
      )

      return
    }

    transaction.set(
      calendarEventRef,
      buildMaterializedImplicitPublicTalkDocument({
        actorUid: options.actorUid,
        now,
        slot: lockedCalendarEvent,
      }),
    )
  })
}


export function toAssignmentFormValues(
  assignment: FirestoreRecord<AssignmentDocument> | null | undefined,
): AssignmentFormValues {
  if (!assignment) {
    return defaultAssignmentFormValues
  }

  return {
    calendarEventId: assignment.calendarEventId,
    localCongregationId: assignment.localCongregationId,
    speakerId: assignment.speakerId,
    themeId: assignment.themeId,
    status: assignment.status,
    notes: assignment.notes,
  }
}

export async function listAssignmentsByYear(
  year: number,
): Promise<Array<FirestoreRecord<AssignmentDocument>>> {
  const rangeStart = Timestamp.fromDate(new Date(year, 0, 1, 0, 0, 0, 0))
  const rangeEnd = Timestamp.fromDate(new Date(year + 1, 0, 1, 0, 0, 0, 0))

  const assignmentsQuery = query(
    getAssignmentsCollection(),
    where('eventDate', '>=', rangeStart),
    where('eventDate', '<', rangeEnd),
    orderBy('eventDate', 'asc'),
  )

  return getTypedCollection(assignmentsQuery, assignmentSchema)
}

export async function listRecentAssignments(
  maxItems: number,
): Promise<Array<FirestoreRecord<AssignmentDocument>>> {
  const recentAssignmentsQuery = query(
    getAssignmentsCollection(),
    orderBy('eventDate', 'desc'),
    limit(maxItems),
  )

  return getTypedCollection(recentAssignmentsQuery, assignmentSchema)
}

export async function listAssignmentsByCalendarEventIds(
  calendarEventIds: string[],
): Promise<Array<FirestoreRecord<AssignmentDocument>>> {
  const normalizedIds = Array.from(
    new Set(calendarEventIds.map((item) => item.trim()).filter(Boolean)),
  )

  if (normalizedIds.length === 0) {
    return []
  }

  const assignments: Array<FirestoreRecord<AssignmentDocument>> = []

  for (let index = 0; index < normalizedIds.length; index += 10) {
    const currentChunk = normalizedIds.slice(index, index + 10)
    const assignmentsQuery = query(
      getAssignmentsCollection(),
      where('calendarEventId', 'in', currentChunk),
    )

    const chunkAssignments = await getTypedCollection(assignmentsQuery, assignmentSchema)
    assignments.push(...chunkAssignments)
  }

  return assignments.sort((left, right) => left.eventDate.toMillis() - right.eventDate.toMillis())
}

export async function listAssignmentHistory({
  periodStart,
  periodEnd,
}: ListAssignmentHistoryInput): Promise<Array<FirestoreRecord<AssignmentDocument>>> {
  const constraints: QueryConstraint[] = [orderBy('eventDate', 'desc')]

  if (periodStart) {
    constraints.unshift(where('eventDate', '>=', toPeriodStartTimestamp(periodStart)))
  }

  if (periodEnd) {
    constraints.unshift(where('eventDate', '<', toPeriodEndExclusiveTimestamp(periodEnd)))
  }

  const historyQuery = query(getAssignmentsCollection(), ...constraints)

  return getTypedCollection(historyQuery, assignmentSchema)
}

export async function listAssignmentHistoryPage({
  cursor,
  pageSize = defaultAssignmentHistoryPageSize,
  periodStart,
  periodEnd,
}: ListAssignmentHistoryPageInput): Promise<AssignmentHistoryPage> {
  const sanitizedPageSize = Math.max(1, Math.min(pageSize, 100))
  const constraints: QueryConstraint[] = [orderBy('eventDate', 'desc')]

  if (periodStart) {
    constraints.unshift(where('eventDate', '>=', toPeriodStartTimestamp(periodStart)))
  }

  if (periodEnd) {
    constraints.unshift(where('eventDate', '<', toPeriodEndExclusiveTimestamp(periodEnd)))
  }

  if (cursor) {
    constraints.push(startAfter(cursor))
  }

  constraints.push(limit(sanitizedPageSize))

  const historyQuery = query(getAssignmentsCollection(), ...constraints)
  const snapshot = await getDocs(historyQuery)
  const items = snapshot.docs.map((documentSnapshot) => {
    const parsedAssignment = assignmentSchema.parse(documentSnapshot.data())

    return {
      id: documentSnapshot.id,
      ...parsedAssignment,
    }
  })
  const nextCursor = snapshot.docs.at(-1) ?? null

  return {
    items,
    nextCursor,
    hasMore: snapshot.docs.length === sanitizedPageSize,
  }
}

export async function createAssignment({
  actorName,
  actorUid,
  ...values
}: CreateAssignmentInput) {
  if (values.status === 'replaced') {
    throw new Error(
      'Use a substituicao automatica da tela em vez de criar uma designacao ja substituida.',
    )
  }

  const [entities, organizationName] = await Promise.all([
    resolveAssignmentEntities(values),
    resolveOrganizationName(),
  ])
  const assignmentRef = doc(getAssignmentsCollection())

  await runAssignmentSlotTransaction({
    actorUid,
    calendarEventId: entities.calendarEvent.id,
    execute: async ({ currentAssignments, now, transaction }) => {
      const operationalAssignments = getOperationalAssignments(currentAssignments)
      const payload = buildAssignmentPayload(values, entities, now)
      const assignmentDocument: AssignmentDocument = {
        ...payload,
        createdAt: now,
        updatedAt: now,
        createdBy: actorUid,
        updatedBy: actorUid,
      }
      const notificationDocuments = buildNotificationDocuments({
        assignment: {
          id: assignmentRef.id,
          eventDate: assignmentDocument.eventDate,
          status: assignmentDocument.status,
          speakerId: assignmentDocument.speakerId,
          createdAt: assignmentDocument.createdAt,
        },
        organizationName,
        recipientEmail: entities.speaker.email,
        speakerName: entities.speaker.name,
        now,
      })

      if (isAssignmentCoveringCalendarSlot(values.status)) {
        operationalAssignments.forEach((assignment) => {
          const replacedAssignment = {
            ...stripRecordId(assignment),
            status: 'replaced' as const,
            confirmedAt: null,
            responseAt: now,
            updatedAt: now,
            updatedBy: actorUid,
          }

          transaction.set(getAssignmentRef(assignment.id), replacedAssignment)
          cancelAutomatedNotificationsInTransaction(transaction, assignment.id, now)
          transaction.set(doc(collection(firebaseDb, 'auditLogs')), {
            entityType: 'assignment',
            entityId: assignment.id,
            action: 'statusChange',
            actorUid,
            actorName: actorName ?? null,
            before: toAuditSnapshot(assignment),
            after: toAuditSnapshot(replacedAssignment),
            metadata: {
              source: 'assignments-phase-8',
              strategy: 'automatic-replacement',
            },
            createdAt: now,
          })
        })
      }

      transaction.set(assignmentRef, assignmentDocument)
      await syncNotificationDocumentsInTransaction(transaction, notificationDocuments)
      transaction.set(doc(collection(firebaseDb, 'auditLogs')), {
        entityType: 'assignment',
        entityId: assignmentRef.id,
        action: 'create',
        actorUid,
        actorName: actorName ?? null,
        before: null,
        after: toAuditSnapshot(assignmentDocument),
        metadata: {
          source: 'assignments-phase-8',
          replacedAssignmentsCount: isAssignmentCoveringCalendarSlot(values.status)
            ? operationalAssignments.length
            : 0,
        },
        createdAt: now,
      })
    },
  })
}

export async function updateAssignment({
  id,
  actorName,
  actorUid,
  ...values
}: UpdateAssignmentInput) {
  const assignmentRef = getAssignmentRef(id)
  const existingAssignment = await getTypedDocument(assignmentRef, assignmentSchema)

  if (!existingAssignment) {
    throw new Error('A designacao selecionada nao foi encontrada.')
  }

  const isIdentityUnchanged =
    existingAssignment.calendarEventId === values.calendarEventId &&
    existingAssignment.localCongregationId === values.localCongregationId &&
    existingAssignment.speakerId === values.speakerId &&
    existingAssignment.themeId === values.themeId
  let updatedAssignment: AssignmentDocument

  if (isIdentityUnchanged && existingAssignment.status === values.status) {
    const now = Timestamp.now()
    updatedAssignment = {
      ...stripRecordId(existingAssignment),
      notes: values.notes.trim(),
      updatedAt: now,
      updatedBy: actorUid,
    }
    const batch = writeBatch(firebaseDb)

    batch.set(assignmentRef, updatedAssignment)
    appendAuditLogToBatch(batch, {
      entityType: 'assignment',
      entityId: id,
      action: 'update',
      actorUid,
      actorName: actorName ?? null,
      before: toAuditSnapshot(existingAssignment),
      after: toAuditSnapshot(updatedAssignment),
      metadata: {
        source: 'assignments-phase-8',
      },
      createdAt: now,
    })

    await batch.commit()
    return
  }

  if (isIdentityUnchanged) {
    const [speakerForNotifications, organizationName] = await Promise.all([
      getSpeakerForNotifications(existingAssignment.speakerId),
      resolveOrganizationName(),
    ])

    if (isAssignmentCoveringCalendarSlot(values.status)) {
      await runAssignmentSlotTransaction({
        actorUid,
        calendarEventId: existingAssignment.calendarEventId,
        execute: async ({ currentAssignments, now, transaction }) => {
          const conflictingOperationalAssignments = getOperationalAssignments(
            currentAssignments,
            id,
          )

          if (conflictingOperationalAssignments.length > 0) {
            throw new Error(
              'Ja existe uma designacao operacional neste evento. Use uma nova designacao para substituir a atual.',
            )
          }

          updatedAssignment = buildExistingAssignmentStatusUpdate(
            existingAssignment,
            values.status,
            values.notes,
            now,
            actorUid,
          )
          const notificationDocuments = buildNotificationDocuments({
            assignment: {
              id,
              eventDate: updatedAssignment.eventDate,
              status: updatedAssignment.status,
              speakerId: updatedAssignment.speakerId,
              createdAt: updatedAssignment.createdAt,
            },
            organizationName,
            recipientEmail: speakerForNotifications.email,
            speakerName: updatedAssignment.speakerName,
            now,
          })

          transaction.set(assignmentRef, updatedAssignment)
          await syncNotificationDocumentsInTransaction(transaction, notificationDocuments)
          transaction.set(doc(collection(firebaseDb, 'auditLogs')), {
            entityType: 'assignment',
            entityId: id,
            action: 'statusChange',
            actorUid,
            actorName: actorName ?? null,
            before: toAuditSnapshot(existingAssignment),
            after: toAuditSnapshot(updatedAssignment),
            metadata: {
              source: 'assignments-phase-8',
            },
            createdAt: now,
          })
        },
      })

      return
    }

    const now = Timestamp.now()

    updatedAssignment = buildExistingAssignmentStatusUpdate(
      existingAssignment,
      values.status,
      values.notes,
      now,
      actorUid,
    )
    const notificationDocuments = buildNotificationDocuments({
      assignment: {
        id,
        eventDate: updatedAssignment.eventDate,
        status: updatedAssignment.status,
        speakerId: updatedAssignment.speakerId,
        createdAt: updatedAssignment.createdAt,
      },
      organizationName,
      recipientEmail: speakerForNotifications.email,
      speakerName: updatedAssignment.speakerName,
      now,
    })
    const batch = writeBatch(firebaseDb)

    batch.set(assignmentRef, updatedAssignment)
    await syncNotificationDocumentsInBatch(batch, notificationDocuments)
    appendAuditLogToBatch(batch, {
      entityType: 'assignment',
      entityId: id,
      action: 'statusChange',
      actorUid,
      actorName: actorName ?? null,
      before: toAuditSnapshot(existingAssignment),
      after: toAuditSnapshot(updatedAssignment),
      metadata: {
        source: 'assignments-phase-8',
      },
      createdAt: now,
    })

    await batch.commit()
    return
  } else {
    const [entities, organizationName] = await Promise.all([
      resolveAssignmentEntities(values),
      resolveOrganizationName(),
    ])
    if (isAssignmentCoveringCalendarSlot(values.status)) {
      await runAssignmentSlotTransaction({
        actorUid,
        calendarEventId: entities.calendarEvent.id,
        execute: async ({ currentAssignments, now, transaction }) => {
          const conflictingOperationalAssignments = getOperationalAssignments(
            currentAssignments,
            id,
          )

          if (conflictingOperationalAssignments.length > 0) {
            throw new Error(
              'Ja existe uma designacao operacional neste evento. Use uma nova designacao para substituir a atual.',
            )
          }

          const payload = buildAssignmentPayload(values, entities, now, existingAssignment)

          updatedAssignment = {
            ...stripRecordId(existingAssignment),
            ...payload,
            updatedAt: now,
            updatedBy: actorUid,
          }
          const notificationDocuments = buildNotificationDocuments({
            assignment: {
              id,
              eventDate: updatedAssignment.eventDate,
              status: updatedAssignment.status,
              speakerId: updatedAssignment.speakerId,
              createdAt: updatedAssignment.createdAt,
            },
            organizationName,
            recipientEmail: entities.speaker.email,
            speakerName: updatedAssignment.speakerName,
            now,
          })

          transaction.set(assignmentRef, updatedAssignment)
          await syncNotificationDocumentsInTransaction(transaction, notificationDocuments)
          transaction.set(doc(collection(firebaseDb, 'auditLogs')), {
            entityType: 'assignment',
            entityId: id,
            action:
              existingAssignment.status !== updatedAssignment.status
                ? 'statusChange'
                : 'update',
            actorUid,
            actorName: actorName ?? null,
            before: toAuditSnapshot(existingAssignment),
            after: toAuditSnapshot(updatedAssignment),
            metadata: {
              source: 'assignments-phase-8',
            },
            createdAt: now,
          })
        },
      })

      return
    }

    const now = Timestamp.now()
    const payload = buildAssignmentPayload(values, entities, now, existingAssignment)

    updatedAssignment = {
      ...stripRecordId(existingAssignment),
      ...payload,
      updatedAt: now,
      updatedBy: actorUid,
    }
    const notificationDocuments = buildNotificationDocuments({
      assignment: {
        id,
        eventDate: updatedAssignment.eventDate,
        status: updatedAssignment.status,
        speakerId: updatedAssignment.speakerId,
        createdAt: updatedAssignment.createdAt,
      },
      organizationName,
      recipientEmail: entities.speaker.email,
      speakerName: updatedAssignment.speakerName,
      now,
    })
    const batch = writeBatch(firebaseDb)

    batch.set(assignmentRef, updatedAssignment)
    await syncNotificationDocumentsInBatch(batch, notificationDocuments)
    appendAuditLogToBatch(batch, {
      entityType: 'assignment',
      entityId: id,
      action:
        existingAssignment.status !== updatedAssignment.status ? 'statusChange' : 'update',
      actorUid,
      actorName: actorName ?? null,
      before: toAuditSnapshot(existingAssignment),
      after: toAuditSnapshot(updatedAssignment),
      metadata: {
        source: 'assignments-phase-8',
      },
      createdAt: now,
    })

    await batch.commit()
    return
  }
}

export async function confirmAssignment({
  id,
  actorName,
  actorUid,
}: ConfirmAssignmentInput) {
  const assignmentRef = getAssignmentRef(id)
  const existingAssignment = await getTypedDocument(assignmentRef, assignmentSchema)

  if (!existingAssignment) {
    throw new Error('A designacao selecionada nao foi encontrada.')
  }

  if (existingAssignment.status === 'confirmed') {
    return
  }

  await runAssignmentSlotTransaction({
    actorUid,
    calendarEventId: existingAssignment.calendarEventId,
    execute: async ({ currentAssignments, now, transaction }) => {
      const conflictingOperationalAssignments = getOperationalAssignments(
        currentAssignments,
        id,
      )

      if (conflictingOperationalAssignments.length > 0) {
        throw new Error(
          'Ja existe outra designacao operacional neste evento. Revise a substituicao antes de confirmar.',
        )
      }

      const confirmedAssignment = buildExistingAssignmentStatusUpdate(
        existingAssignment,
        'confirmed',
        existingAssignment.notes,
        now,
        actorUid,
      )

      transaction.set(assignmentRef, confirmedAssignment)
      cancelConfirmationNotificationInTransaction(transaction, id, now)
      transaction.set(doc(collection(firebaseDb, 'auditLogs')), {
        entityType: 'assignment',
        entityId: id,
        action: 'statusChange',
        actorUid,
        actorName: actorName ?? null,
        before: toAuditSnapshot(existingAssignment),
        after: toAuditSnapshot(confirmedAssignment),
        metadata: {
          source: 'assignments-phase-8',
          trigger: 'manual-confirmation',
        },
        createdAt: now,
      })
    },
  })
}
