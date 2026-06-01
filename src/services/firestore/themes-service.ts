import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  where,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  speakerSchema,
  themeNumberReservationSchema,
  themeSchema,
  type ThemeDocument,
  type FirestoreRecord,
  type ThemeNumberReservationDocument,
} from '@/types/firestore'

import { appendAuditLogToTransaction } from './audit-logs-service'
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

function getThemeNumberReservationRef(number: number) {
  return doc(firebaseDb, 'themeNumbers', String(number))
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

async function assertNoLegacyThemeConflict(number: number, excludeId?: string) {
  const conflictingThemesSnapshot = await getDocs(
    query(getThemesCollection(), where('number', '==', number), limit(5)),
  )
  const conflictingTheme = conflictingThemesSnapshot.docs.find(
    (documentSnapshot) => documentSnapshot.id !== excludeId,
  )

  if (conflictingTheme) {
    throw new Error(`O tema ${number} ja existe na base e precisa ser reutilizado.`)
  }
}

function buildThemeNumberReservation(
  number: number,
  themeId: string,
  now: Timestamp,
  createdAt?: Timestamp,
): ThemeNumberReservationDocument {
  return {
    number,
    themeId,
    createdAt: createdAt ?? now,
    updatedAt: now,
  }
}

async function assertThemeHasNoActiveSpeakers(themeId: string) {
  const linkedSpeakersSnapshot = await getDocs(
    query(
      collection(firebaseDb, 'speakers'),
      where('themeIds', 'array-contains', themeId),
    ),
  )
  const hasActiveLinkedSpeaker = linkedSpeakersSnapshot.docs.some((documentSnapshot) => {
    const speaker = speakerSchema.parse(documentSnapshot.data())

    return speaker.isActive
  })

  if (hasActiveLinkedSpeaker) {
    throw new Error(
      'Nao e possivel retirar este tema da base ativa enquanto houver oradores ativos vinculados a ele.',
    )
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
  const themeRef = doc(getThemesCollection())
  const payload = buildThemePayload(values)
  const reservationRef = getThemeNumberReservationRef(payload.number)

  await assertNoLegacyThemeConflict(payload.number)

  await runTransaction(firebaseDb, async (transaction) => {
    const now = Timestamp.now()
    const reservationSnapshot = await transaction.get(reservationRef)

    if (reservationSnapshot.exists()) {
      throw new Error(
        `O tema ${payload.number} ja existe na base e precisa ser reutilizado.`,
      )
    }

    const themeDocument: ThemeDocument = {
      ...payload,
      createdAt: now,
      updatedAt: now,
      createdBy: actorUid,
      updatedBy: actorUid,
    }

    transaction.set(themeRef, themeDocument)
    transaction.set(
      reservationRef,
      buildThemeNumberReservation(payload.number, themeRef.id, now),
    )
    appendAuditLogToTransaction(transaction, {
      entityType: 'theme',
      entityId: themeRef.id,
      action: 'create',
      actorUid,
      actorName: actorName ?? null,
      before: null,
      after: toAuditSnapshot(themeDocument),
      metadata: {
        source: 'themes-phase-5',
        reservationNumber: payload.number,
      },
      createdAt: now,
    })
  })
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

  const payload = buildThemePayload(values)

  if (existingTheme.isActive && !payload.isActive) {
    await assertThemeHasNoActiveSpeakers(id)
  }

  await assertNoLegacyThemeConflict(payload.number, id)

  await runTransaction(firebaseDb, async (transaction) => {
    const now = Timestamp.now()
    const currentThemeSnapshot = await transaction.get(themeRef)

    if (!currentThemeSnapshot.exists()) {
      throw new Error('O tema selecionado nao foi encontrado.')
    }

    const currentTheme = {
      id: currentThemeSnapshot.id,
      ...themeSchema.parse(currentThemeSnapshot.data()),
    }
    const currentReservationRef = getThemeNumberReservationRef(currentTheme.number)
    const nextReservationRef = getThemeNumberReservationRef(payload.number)
    const currentReservationSnapshot = await transaction.get(currentReservationRef)
    const nextReservationSnapshot =
      payload.number === currentTheme.number
        ? currentReservationSnapshot
        : await transaction.get(nextReservationRef)
    const currentReservation = currentReservationSnapshot.exists()
      ? themeNumberReservationSchema.parse(currentReservationSnapshot.data())
      : null
    const nextReservation = nextReservationSnapshot.exists()
      ? themeNumberReservationSchema.parse(nextReservationSnapshot.data())
      : null

    if (nextReservation && nextReservation.themeId !== id) {
      throw new Error(
        `O tema ${payload.number} ja existe na base e precisa ser reutilizado.`,
      )
    }

    const updatedTheme: ThemeDocument = {
      ...stripRecordId(currentTheme),
      ...payload,
      updatedAt: now,
      updatedBy: actorUid,
    }

    transaction.set(themeRef, updatedTheme)
    transaction.set(
      nextReservationRef,
      buildThemeNumberReservation(
        payload.number,
        id,
        now,
        nextReservation
          ? nextReservation.createdAt
          : currentReservation
            ? currentReservation.createdAt
            : now,
      ),
    )

    if (payload.number !== currentTheme.number && currentReservationSnapshot.exists()) {
      transaction.delete(currentReservationRef)
    }

    appendAuditLogToTransaction(transaction, {
      entityType: 'theme',
      entityId: id,
      action: 'update',
      actorUid,
      actorName: actorName ?? null,
      before: toAuditSnapshot(currentTheme),
      after: toAuditSnapshot(updatedTheme),
      metadata: {
        source: 'themes-phase-5',
        reservationNumber: payload.number,
      },
      createdAt: now,
    })
  })
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

  await assertThemeHasNoActiveSpeakers(id)

  await runTransaction(firebaseDb, async (transaction) => {
    const now = Timestamp.now()
    const currentThemeSnapshot = await transaction.get(themeRef)

    if (!currentThemeSnapshot.exists()) {
      throw new Error('O tema selecionado nao esta mais ativo na base.')
    }

    const currentTheme = {
      id: currentThemeSnapshot.id,
      ...themeSchema.parse(currentThemeSnapshot.data()),
    }

    if (!currentTheme.isActive) {
      throw new Error('O tema selecionado nao esta mais ativo na base.')
    }

    const archivedTheme: ThemeDocument = {
      ...stripRecordId(currentTheme),
      isActive: false,
      updatedAt: now,
      updatedBy: actorUid,
    }

    transaction.set(themeRef, archivedTheme)
    appendAuditLogToTransaction(transaction, {
      entityType: 'theme',
      entityId: id,
      action: 'delete',
      actorUid,
      actorName: actorName ?? null,
      before: toAuditSnapshot(currentTheme),
      after: toAuditSnapshot(archivedTheme),
      metadata: {
        source: 'themes-phase-5',
        strategy: 'soft-delete',
        reservationNumber: currentTheme.number,
      },
      createdAt: now,
    })
  })
}
