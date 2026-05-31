import {
  Timestamp,
  collection,
  doc,
  documentId,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  congregationSchema,
  speakerSchema,
  type CongregationDocument,
  type FirestoreRecord,
  type SpeakerDocument,
  type SpeakerStatus,
  type SpeakerType,
} from '@/types/firestore'

import { appendAuditLogToBatch } from './audit-logs-service'
import { getTypedCollection, getTypedDocument } from './shared'

export type SpeakerFormValues = {
  name: string
  email: string
  phone: string
  congregationId: string
  type: SpeakerType
  themeIds: string[]
  status: SpeakerStatus
  unavailableStart: string
  unavailableEnd: string
  notes: string
}

export type CreateSpeakerInput = SpeakerFormValues & {
  actorUid: string
  actorName?: string | null
}

export type UpdateSpeakerInput = CreateSpeakerInput & {
  id: string
}

export type DeleteSpeakerInput = {
  id: string
  actorUid: string
  actorName?: string | null
}

export const defaultSpeakerFormValues: SpeakerFormValues = {
  name: '',
  email: '',
  phone: '',
  congregationId: '',
  type: 'visitor',
  themeIds: [],
  status: 'active',
  unavailableStart: '',
  unavailableEnd: '',
  notes: '',
}

function getSpeakersCollection() {
  return collection(firebaseDb, 'speakers')
}

function getSpeakerRef(id: string) {
  return doc(firebaseDb, 'speakers', id)
}

function getCongregationRef(id: string) {
  return doc(firebaseDb, 'congregations', id)
}

function stripRecordId(
  speaker: FirestoreRecord<SpeakerDocument>,
): SpeakerDocument {
  const { id, ...documentData } = speaker
  void id

  return documentData
}

function toAuditSnapshot(
  speaker: FirestoreRecord<SpeakerDocument> | SpeakerDocument,
): Record<string, unknown> {
  if ('id' in speaker) {
    return stripRecordId(speaker)
  }

  return { ...speaker }
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`
}

function parseDateInput(value: string) {
  const [yearString, monthString, dayString] = value.split('-')
  const year = Number.parseInt(yearString, 10)
  const month = Number.parseInt(monthString, 10)
  const day = Number.parseInt(dayString, 10)

  return Timestamp.fromDate(new Date(year, month - 1, day, 0, 0, 0, 0))
}

function normalizeThemeIds(themeIds: string[]) {
  return Array.from(new Set(themeIds.map((item) => item.trim()).filter(Boolean)))
}

function resolveSpeakerActivity(status: SpeakerStatus) {
  return status !== 'inactive' && status !== 'transferred'
}

function buildSpeakerPayload(
  values: SpeakerFormValues,
  congregation: FirestoreRecord<CongregationDocument>,
): Omit<
  SpeakerDocument,
  'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
> {
  const normalizedThemeIds = normalizeThemeIds(values.themeIds)
  const hasUnavailableWindow =
    values.status === 'vacation' || values.status === 'unavailable'

  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    congregationId: congregation.id,
    congregationName: congregation.name,
    type: values.type,
    themeIds: normalizedThemeIds,
    status: values.status,
    unavailableStart:
      hasUnavailableWindow && values.unavailableStart
        ? parseDateInput(values.unavailableStart)
        : null,
    unavailableEnd:
      hasUnavailableWindow && values.unavailableEnd
        ? parseDateInput(values.unavailableEnd)
        : null,
    notes: values.notes.trim(),
    isActive: resolveSpeakerActivity(values.status),
  }
}

async function assertCongregationExists(id: string) {
  const congregation = await getTypedDocument(
    getCongregationRef(id),
    congregationSchema,
  )

  if (!congregation || !congregation.isActive) {
    throw new Error('A congregacao selecionada nao esta mais disponivel.')
  }

  return congregation
}

async function assertThemesExist(themeIds: string[]) {
  const normalizedThemeIds = normalizeThemeIds(themeIds)

  if (normalizedThemeIds.length === 0) {
    throw new Error('Selecione pelo menos um tema para o orador.')
  }

  const foundThemeIds = new Set<string>()

  for (let index = 0; index < normalizedThemeIds.length; index += 10) {
    const currentChunk = normalizedThemeIds.slice(index, index + 10)
    const themesSnapshot = await getDocs(
      query(
        collection(firebaseDb, 'themes'),
        where(documentId(), 'in', currentChunk),
      ),
    )

    themesSnapshot.docs.forEach((documentSnapshot) => {
      foundThemeIds.add(documentSnapshot.id)
    })
  }

  const missingThemeIds = normalizedThemeIds.filter(
    (themeId) => !foundThemeIds.has(themeId),
  )

  if (missingThemeIds.length > 0) {
    throw new Error(
      'Um ou mais temas selecionados nao existem mais na base e precisam ser ajustados.',
    )
  }
}

export function toSpeakerFormValues(
  speaker: FirestoreRecord<SpeakerDocument> | null | undefined,
): SpeakerFormValues {
  if (!speaker) {
    return defaultSpeakerFormValues
  }

  return {
    name: speaker.name,
    email: speaker.email,
    phone: speaker.phone,
    congregationId: speaker.congregationId,
    type: speaker.type,
    themeIds: [...speaker.themeIds],
    status: speaker.status,
    unavailableStart: speaker.unavailableStart
      ? formatDateInput(speaker.unavailableStart.toDate())
      : '',
    unavailableEnd: speaker.unavailableEnd
      ? formatDateInput(speaker.unavailableEnd.toDate())
      : '',
    notes: speaker.notes,
  }
}

export async function listSpeakers(): Promise<
  Array<FirestoreRecord<SpeakerDocument>>
> {
  const speakersQuery = query(
    getSpeakersCollection(),
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  )

  return getTypedCollection(speakersQuery, speakerSchema)
}

export async function listSpeakersForManagement(): Promise<
  Array<FirestoreRecord<SpeakerDocument>>
> {
  const speakersQuery = query(getSpeakersCollection(), orderBy('name', 'asc'))

  return getTypedCollection(speakersQuery, speakerSchema)
}

export async function createSpeaker({
  actorName,
  actorUid,
  ...values
}: CreateSpeakerInput) {
  const now = Timestamp.now()
  const speakerRef = doc(getSpeakersCollection())
  const congregation = await assertCongregationExists(values.congregationId)

  await assertThemesExist(values.themeIds)

  const payload = buildSpeakerPayload(values, congregation)
  const speakerDocument: SpeakerDocument = {
    ...payload,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(speakerRef, speakerDocument)
  appendAuditLogToBatch(batch, {
    entityType: 'speaker',
    entityId: speakerRef.id,
    action: 'create',
    actorUid,
    actorName: actorName ?? null,
    before: null,
    after: toAuditSnapshot(speakerDocument),
    metadata: {
      source: 'speakers-phase-6',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function updateSpeaker({
  id,
  actorName,
  actorUid,
  ...values
}: UpdateSpeakerInput) {
  const speakerRef = getSpeakerRef(id)
  const existingSpeaker = await getTypedDocument(speakerRef, speakerSchema)

  if (!existingSpeaker) {
    throw new Error('O orador selecionado nao foi encontrado.')
  }

  const congregation = await assertCongregationExists(values.congregationId)

  await assertThemesExist(values.themeIds)

  const now = Timestamp.now()
  const payload = buildSpeakerPayload(values, congregation)
  const updatedSpeaker: SpeakerDocument = {
    ...stripRecordId(existingSpeaker),
    ...payload,
    updatedAt: now,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(speakerRef, updatedSpeaker)
  appendAuditLogToBatch(batch, {
    entityType: 'speaker',
    entityId: id,
    action: 'update',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingSpeaker),
    after: toAuditSnapshot(updatedSpeaker),
    metadata: {
      source: 'speakers-phase-6',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function deleteSpeaker({
  id,
  actorName,
  actorUid,
}: DeleteSpeakerInput) {
  const speakerRef = getSpeakerRef(id)
  const existingSpeaker = await getTypedDocument(speakerRef, speakerSchema)

  if (!existingSpeaker || !existingSpeaker.isActive) {
    throw new Error('O orador selecionado ja nao esta na base ativa.')
  }

  const now = Timestamp.now()
  const archivedSpeaker: SpeakerDocument = {
    ...stripRecordId(existingSpeaker),
    status: 'inactive',
    isActive: false,
    unavailableStart: null,
    unavailableEnd: null,
    updatedAt: now,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(speakerRef, archivedSpeaker)
  appendAuditLogToBatch(batch, {
    entityType: 'speaker',
    entityId: id,
    action: 'delete',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingSpeaker),
    after: toAuditSnapshot(archivedSpeaker),
    metadata: {
      source: 'speakers-phase-6',
      strategy: 'soft-delete',
    },
    createdAt: now,
  })

  await batch.commit()
}
