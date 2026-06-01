import {
  Timestamp,
  type Transaction,
  runTransaction,
  collection,
  doc,
  limit,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  assignmentSchema,
  calendarEventSchema,
  congregationSchema,
  speakerSchema,
  themeSchema,
  type AssignmentDocument,
  type AssignmentStatus,
  type CalendarEventDocument,
  type CongregationDocument,
  type FirestoreRecord,
  type SpeakerDocument,
  type ThemeDocument,
} from '@/types/firestore'
import {
  isAssignmentCoveringCalendarSlot,
  toLocalDateKey,
} from '@/utils/calendar-events'

import { appendAuditLogToBatch } from './audit-logs-service'
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

function getCalendarEventRef(id: string) {
  return doc(firebaseDb, 'calendarEvents', id)
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

function stripCalendarEventRecord(
  calendarEvent: FirestoreRecord<CalendarEventDocument>,
): CalendarEventDocument {
  const { id, ...documentData } = calendarEvent
  void id

  return documentData
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
    confirmationToken: existingAssignment?.confirmationToken ?? null,
    confirmedAt: statusFields.confirmedAt,
    responseAt: statusFields.responseAt,
  }
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

async function assertCalendarEventExists(id: string) {
  const calendarEvent = await getTypedDocument(getCalendarEventRef(id), calendarEventSchema)

  if (!calendarEvent || !calendarEvent.isActive) {
    throw new Error('O evento selecionado nao esta mais disponivel na agenda ativa.')
  }

  if (calendarEvent.blocksAssignments) {
    throw new Error(
      'Este evento bloqueia designacoes oficialmente. Escolha um sabado ou evento liberado.',
    )
  }

  return calendarEvent
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
  }) => void
}) {
  await runTransaction(firebaseDb, async (transaction) => {
    const calendarEventRef = getCalendarEventRef(options.calendarEventId)
    const calendarEventSnapshot = await transaction.get(calendarEventRef)

    if (!calendarEventSnapshot.exists()) {
      throw new Error('O evento selecionado nao esta mais disponivel na agenda ativa.')
    }

    const parsedCalendarEvent = calendarEventSchema.parse(calendarEventSnapshot.data())
    const lockedCalendarEvent: FirestoreRecord<CalendarEventDocument> = {
      id: calendarEventSnapshot.id,
      ...parsedCalendarEvent,
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

    options.execute({
      currentAssignments,
      now,
      transaction,
    })

    // Touch the event document with its current payload so concurrent slot mutations retry.
    transaction.set(calendarEventRef, stripCalendarEventRecord(lockedCalendarEvent))
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

  const entities = await resolveAssignmentEntities(values)
  const assignmentRef = doc(getAssignmentsCollection())

  await runAssignmentSlotTransaction({
    actorUid,
    calendarEventId: entities.calendarEvent.id,
    execute: ({ currentAssignments, now, transaction }) => {
      const operationalAssignments = getOperationalAssignments(currentAssignments)
      const payload = buildAssignmentPayload(values, entities, now)
      const assignmentDocument: AssignmentDocument = {
        ...payload,
        createdAt: now,
        updatedAt: now,
        createdBy: actorUid,
        updatedBy: actorUid,
      }

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
    if (isAssignmentCoveringCalendarSlot(values.status)) {
      await runAssignmentSlotTransaction({
        actorUid,
        calendarEventId: existingAssignment.calendarEventId,
        execute: ({ currentAssignments, now, transaction }) => {
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

          transaction.set(assignmentRef, updatedAssignment)
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
    const batch = writeBatch(firebaseDb)

    batch.set(assignmentRef, updatedAssignment)
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
    const entities = await resolveAssignmentEntities(values)
    if (isAssignmentCoveringCalendarSlot(values.status)) {
      await runAssignmentSlotTransaction({
        actorUid,
        calendarEventId: entities.calendarEvent.id,
        execute: ({ currentAssignments, now, transaction }) => {
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

          transaction.set(assignmentRef, updatedAssignment)
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
  }
  const now = Timestamp.now()
  const batch = writeBatch(firebaseDb)

  batch.set(assignmentRef, updatedAssignment)
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
    execute: ({ currentAssignments, now, transaction }) => {
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
