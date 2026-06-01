import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase-db'
import {
  congregationSchema,
  type CongregationDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { appendAuditLogToBatch } from './audit-logs-service'
import { getTypedCollection, getTypedDocument } from './shared'

export type CongregationFormValues = {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  mapsUrl: string
  meetingDay: string
  meetingTime: string
  notes: string
  isLocal: boolean
}

export type CreateCongregationInput = CongregationFormValues & {
  actorUid: string
  actorName?: string | null
}

export type UpdateCongregationInput = CreateCongregationInput & {
  id: string
}

export type DeleteCongregationInput = {
  id: string
  actorUid: string
  actorName?: string | null
}

export const defaultCongregationFormValues: CongregationFormValues = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  mapsUrl: '',
  meetingDay: '',
  meetingTime: '',
  notes: '',
  isLocal: false,
}

function getCongregationsCollection() {
  return collection(firebaseDb, 'congregations')
}

function getCongregationRef(id: string) {
  return doc(firebaseDb, 'congregations', id)
}

function normalizeZipCode(zipCode: string) {
  const digitsOnly = zipCode.replace(/\D/g, '')

  if (digitsOnly.length === 8) {
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`
  }

  return zipCode.trim()
}

function buildCongregationPayload(
  values: CongregationFormValues,
): Omit<
  CongregationDocument,
  'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isActive'
> {
  return {
    name: values.name.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim().toUpperCase(),
    zipCode: normalizeZipCode(values.zipCode),
    mapsUrl: values.mapsUrl.trim(),
    meetingDay: values.meetingDay.trim(),
    meetingTime: values.meetingTime.trim(),
    notes: values.notes.trim(),
    isLocal: values.isLocal,
  }
}

function toAuditSnapshot(
  congregation: FirestoreRecord<CongregationDocument> | CongregationDocument,
): Record<string, unknown> {
  if ('id' in congregation) {
    return stripRecordId(congregation)
  }

  return { ...congregation }
}

function stripRecordId(
  congregation: FirestoreRecord<CongregationDocument>,
): CongregationDocument {
  const { id, ...documentData } = congregation
  void id

  return documentData
}

export function toCongregationFormValues(
  congregation: FirestoreRecord<CongregationDocument> | null | undefined,
): CongregationFormValues {
  if (!congregation) {
    return defaultCongregationFormValues
  }

  return {
    name: congregation.name,
    address: congregation.address,
    city: congregation.city,
    state: congregation.state,
    zipCode: congregation.zipCode,
    mapsUrl: congregation.mapsUrl,
    meetingDay: congregation.meetingDay,
    meetingTime: congregation.meetingTime,
    notes: congregation.notes,
    isLocal: congregation.isLocal,
  }
}

export async function listCongregations(): Promise<
  Array<FirestoreRecord<CongregationDocument>>
> {
  const congregationsQuery = query(
    getCongregationsCollection(),
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  )

  return getTypedCollection(congregationsQuery, congregationSchema)
}

export async function listCongregationsForManagement(): Promise<
  Array<FirestoreRecord<CongregationDocument>>
> {
  const congregationsQuery = query(getCongregationsCollection(), orderBy('name', 'asc'))

  return getTypedCollection(congregationsQuery, congregationSchema)
}

export async function createCongregation({
  actorName,
  actorUid,
  ...values
}: CreateCongregationInput) {
  const now = Timestamp.now()
  const congregationRef = doc(getCongregationsCollection())
  const payload = buildCongregationPayload(values)
  const congregationDocument: CongregationDocument = {
    ...payload,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(congregationRef, congregationDocument)
  appendAuditLogToBatch(batch, {
    entityType: 'congregation',
    entityId: congregationRef.id,
    action: 'create',
    actorUid,
    actorName: actorName ?? null,
    before: null,
    after: toAuditSnapshot(congregationDocument),
    metadata: {
      source: 'congregations-phase-4',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function updateCongregation({
  id,
  actorName,
  actorUid,
  ...values
}: UpdateCongregationInput) {
  const congregationRef = getCongregationRef(id)
  const existingCongregation = await getTypedDocument(
    congregationRef,
    congregationSchema,
  )

  if (!existingCongregation || !existingCongregation.isActive) {
    throw new Error('A congregacao selecionada nao esta mais disponivel.')
  }

  const now = Timestamp.now()
  const payload = buildCongregationPayload(values)
  const existingDocument = stripRecordId(existingCongregation)
  const updatedCongregation: CongregationDocument = {
    ...existingDocument,
    ...payload,
    updatedAt: now,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(congregationRef, updatedCongregation)
  appendAuditLogToBatch(batch, {
    entityType: 'congregation',
    entityId: id,
    action: 'update',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingCongregation),
    after: toAuditSnapshot(updatedCongregation),
    metadata: {
      source: 'congregations-phase-4',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function deleteCongregation({
  id,
  actorName,
  actorUid,
}: DeleteCongregationInput) {
  const congregationRef = getCongregationRef(id)
  const existingCongregation = await getTypedDocument(
    congregationRef,
    congregationSchema,
  )

  if (!existingCongregation || !existingCongregation.isActive) {
    throw new Error('A congregacao selecionada nao esta mais disponivel.')
  }

  const linkedSpeakersQuery = query(
    collection(firebaseDb, 'speakers'),
    where('congregationId', '==', id),
    limit(1),
  )
  const linkedSpeakersSnapshot = await getDocs(linkedSpeakersQuery)

  if (!linkedSpeakersSnapshot.empty) {
    throw new Error(
      'Nao e possivel excluir esta congregacao porque ha oradores vinculados a ela.',
    )
  }

  const now = Timestamp.now()
  const existingDocument = stripRecordId(existingCongregation)
  const archivedCongregation: CongregationDocument = {
    ...existingDocument,
    isActive: false,
    updatedAt: now,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(congregationRef, archivedCongregation)
  appendAuditLogToBatch(batch, {
    entityType: 'congregation',
    entityId: id,
    action: 'delete',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingCongregation),
    after: toAuditSnapshot(archivedCongregation),
    metadata: {
      source: 'congregations-phase-4',
      strategy: 'soft-delete',
    },
    createdAt: now,
  })

  await batch.commit()
}
