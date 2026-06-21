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
  mapsUrl: string
  meetingDay: string
  meetingTime: string
  publicTalkCoordinatorName: string
  publicTalkCoordinatorPhone: string
  publicTalkCoordinatorEmail: string
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
  mapsUrl: '',
  meetingDay: '',
  meetingTime: '',
  publicTalkCoordinatorName: '',
  publicTalkCoordinatorPhone: '',
  publicTalkCoordinatorEmail: '',
  notes: '',
  isLocal: false,
}

function getCongregationsCollection() {
  return collection(firebaseDb, 'congregations')
}

function getCongregationRef(id: string) {
  return doc(firebaseDb, 'congregations', id)
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
    mapsUrl: values.mapsUrl.trim(),
    meetingDay: values.meetingDay.trim(),
    meetingTime: values.meetingTime.trim(),
    publicTalkCoordinatorName: values.publicTalkCoordinatorName.trim(),
    publicTalkCoordinatorPhone: values.publicTalkCoordinatorPhone.trim(),
    publicTalkCoordinatorEmail: values.publicTalkCoordinatorEmail.trim().toLowerCase(),
    publicTalkCoordinatorContact: '',
    notes: values.notes.trim(),
    isLocal: values.isLocal,
  }
}

async function listOtherActiveLocalCongregations(exceptId?: string) {
  const localCongregationsQuery = query(
    getCongregationsCollection(),
    where('isLocal', '==', true),
  )
  const localCongregations = await getTypedCollection(
    localCongregationsQuery,
    congregationSchema,
  )

  return localCongregations.filter(
    (congregation) => congregation.isActive && congregation.id !== exceptId,
  )
}

async function assertCanSaveLocalCongregation(values: CongregationFormValues, id?: string) {
  if (!values.isLocal) {
    return
  }

  const otherActiveLocalCongregations = await listOtherActiveLocalCongregations(id)

  if (otherActiveLocalCongregations.length > 0) {
    throw new Error(
      'Ja existe uma congregacao local ativa. Atualize a congregacao local fixa em vez de cadastrar outra.',
    )
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
    mapsUrl: congregation.mapsUrl,
    meetingDay: congregation.meetingDay,
    meetingTime: congregation.meetingTime,
    publicTalkCoordinatorName:
      congregation.publicTalkCoordinatorName || congregation.publicTalkCoordinatorContact,
    publicTalkCoordinatorPhone: congregation.publicTalkCoordinatorPhone,
    publicTalkCoordinatorEmail: congregation.publicTalkCoordinatorEmail,
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

  await assertCanSaveLocalCongregation(values)

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

  if (existingCongregation.isLocal && !values.isLocal) {
    throw new Error('A congregacao local fixa nao pode ser convertida em externa.')
  }

  await assertCanSaveLocalCongregation(values, id)

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

  if (existingCongregation.isLocal) {
    throw new Error('A congregacao local fixa nao pode ser excluida da base ativa.')
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
