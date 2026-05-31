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

import { firebaseDb } from '@/lib/firebase'
import {
  themeSchema,
  type ThemeDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { appendAuditLogToBatch } from './audit-logs-service'
import { getTypedCollection, getTypedDocument } from './shared'

export type ThemeFormValues = {
  number: string
  title: string
  notes: string
  isActive: boolean
}

export type CreateThemeInput = ThemeFormValues & {
  actorUid: string
  actorName?: string | null
}

export type UpdateThemeInput = CreateThemeInput & {
  id: string
}

export type DeleteThemeInput = {
  id: string
  actorUid: string
  actorName?: string | null
}

export const defaultThemeFormValues: ThemeFormValues = {
  number: '',
  title: '',
  notes: '',
  isActive: true,
}

function getThemesCollection() {
  return collection(firebaseDb, 'themes')
}

function getThemeRef(id: string) {
  return doc(firebaseDb, 'themes', id)
}

function buildThemePayload(
  values: ThemeFormValues,
): Omit<ThemeDocument, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {
  return {
    number: Number.parseInt(values.number.trim(), 10),
    title: values.title.trim(),
    notes: values.notes.trim(),
    isActive: values.isActive,
  }
}

function stripRecordId(theme: FirestoreRecord<ThemeDocument>): ThemeDocument {
  const { id, ...documentData } = theme
  void id

  return documentData
}

function toAuditSnapshot(
  theme: FirestoreRecord<ThemeDocument> | ThemeDocument,
): Record<string, unknown> {
  if ('id' in theme) {
    return stripRecordId(theme)
  }

  return { ...theme }
}

async function assertThemeNumberIsUnique(number: number, excludeId?: string) {
  const conflictingThemesQuery = query(
    getThemesCollection(),
    where('number', '==', number),
    limit(5),
  )
  const conflictingThemesSnapshot = await getDocs(conflictingThemesQuery)
  const conflictingTheme = conflictingThemesSnapshot.docs.find(
    (documentSnapshot) => documentSnapshot.id !== excludeId,
  )

  if (conflictingTheme) {
    throw new Error(`O tema ${number} ja existe na base e precisa ser reutilizado.`)
  }
}

export function toThemeFormValues(
  theme: FirestoreRecord<ThemeDocument> | null | undefined,
): ThemeFormValues {
  if (!theme) {
    return defaultThemeFormValues
  }

  return {
    number: String(theme.number),
    title: theme.title,
    notes: theme.notes,
    isActive: theme.isActive,
  }
}

export async function listThemes(): Promise<Array<FirestoreRecord<ThemeDocument>>> {
  const themesQuery = query(
    collection(firebaseDb, 'themes'),
    where('isActive', '==', true),
    orderBy('number', 'asc'),
  )

  return getTypedCollection(themesQuery, themeSchema)
}

export async function listThemesForManagement(): Promise<
  Array<FirestoreRecord<ThemeDocument>>
> {
  const themesQuery = query(getThemesCollection(), orderBy('number', 'asc'))

  return getTypedCollection(themesQuery, themeSchema)
}

export async function createTheme({
  actorName,
  actorUid,
  ...values
}: CreateThemeInput) {
  const now = Timestamp.now()
  const themeRef = doc(getThemesCollection())
  const payload = buildThemePayload(values)

  await assertThemeNumberIsUnique(payload.number)

  const themeDocument: ThemeDocument = {
    ...payload,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(themeRef, themeDocument)
  appendAuditLogToBatch(batch, {
    entityType: 'theme',
    entityId: themeRef.id,
    action: 'create',
    actorUid,
    actorName: actorName ?? null,
    before: null,
    after: toAuditSnapshot(themeDocument),
    metadata: {
      source: 'themes-phase-5',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function updateTheme({
  id,
  actorName,
  actorUid,
  ...values
}: UpdateThemeInput) {
  const themeRef = getThemeRef(id)
  const existingTheme = await getTypedDocument(themeRef, themeSchema)

  if (!existingTheme) {
    throw new Error('O tema selecionado nao foi encontrado.')
  }

  const now = Timestamp.now()
  const payload = buildThemePayload(values)

  await assertThemeNumberIsUnique(payload.number, id)

  const existingDocument = stripRecordId(existingTheme)
  const updatedTheme: ThemeDocument = {
    ...existingDocument,
    ...payload,
    updatedAt: now,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(themeRef, updatedTheme)
  appendAuditLogToBatch(batch, {
    entityType: 'theme',
    entityId: id,
    action: 'update',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingTheme),
    after: toAuditSnapshot(updatedTheme),
    metadata: {
      source: 'themes-phase-5',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function deleteTheme({
  id,
  actorName,
  actorUid,
}: DeleteThemeInput) {
  const themeRef = getThemeRef(id)
  const existingTheme = await getTypedDocument(themeRef, themeSchema)

  if (!existingTheme || !existingTheme.isActive) {
    throw new Error('O tema selecionado nao esta mais ativo na base.')
  }

  const now = Timestamp.now()
  const archivedTheme: ThemeDocument = {
    ...stripRecordId(existingTheme),
    isActive: false,
    updatedAt: now,
    updatedBy: actorUid,
  }
  const batch = writeBatch(firebaseDb)

  batch.set(themeRef, archivedTheme)
  appendAuditLogToBatch(batch, {
    entityType: 'theme',
    entityId: id,
    action: 'delete',
    actorUid,
    actorName: actorName ?? null,
    before: toAuditSnapshot(existingTheme),
    after: toAuditSnapshot(archivedTheme),
    metadata: {
      source: 'themes-phase-5',
      strategy: 'soft-delete',
    },
    createdAt: now,
  })

  await batch.commit()
}
