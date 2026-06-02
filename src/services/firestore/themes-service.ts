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
  writeBatch,
} from 'firebase/firestore'

import { type ThemeCategory } from '@/lib/theme-categories'
import { firebaseDb } from '@/lib/firebase-db'
import {
  speakerSchema,
  themeNumberReservationSchema,
  themeSchema,
  type FirestoreRecord,
  type ThemeDocument,
  type ThemeNumberReservationDocument,
} from '@/types/firestore'
import type { ThemeImportComparable } from '@/utils/theme-catalog-import'

import { appendAuditLogToBatch, appendAuditLogToTransaction } from './audit-logs-service'
import { getTypedCollection, getTypedDocument } from './shared'

const maxBatchWrites = 450

export type ThemeFormValues = {
  number: string
  title: string
  category: ThemeCategory
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

export type ImportThemesInput = {
  items: ThemeImportComparable[]
  actorUid: string
  actorName?: string | null
  sourceLabel?: string | null
}

export type ImportThemesResult = {
  createdCount: number
  updatedCount: number
  unchangedCount: number
}

export const defaultThemeFormValues: ThemeFormValues = {
  number: '',
  title: '',
  category: 'bibleGod',
  notes: '',
  isActive: true,
}

type ThemeImportOperation = {
  writeCount: number
  apply: (batch: ReturnType<typeof writeBatch>) => void
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

function normalizeThemeNumber(numberValue: string) {
  return Number.parseInt(numberValue.trim(), 10)
}

function normalizeThemeTitle(title: string) {
  return title.trim()
}

function normalizeThemeNotes(notes: string) {
  return notes.trim()
}

function buildThemePayload(
  values: ThemeFormValues,
): Omit<ThemeDocument, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {
  return {
    number: normalizeThemeNumber(values.number),
    title: normalizeThemeTitle(values.title),
    category: values.category,
    notes: normalizeThemeNotes(values.notes),
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

function buildThemeImportItems(items: ThemeImportComparable[]) {
  const normalizedItems = items
    .map((item) => ({
      number: item.number,
      title: normalizeThemeTitle(item.title),
      category: item.category,
      isActive: item.isActive,
    }))
    .sort((left, right) => left.number - right.number)

  const seenNumbers = new Set<number>()

  normalizedItems.forEach((item) => {
    if (seenNumbers.has(item.number)) {
      throw new Error(`A importacao recebeu o tema ${item.number} mais de uma vez.`)
    }

    seenNumbers.add(item.number)
  })

  return normalizedItems
}

function buildImportOperations({
  actorName,
  actorUid,
  existingThemes,
  items,
  reservationsByNumber,
  sourceLabel,
}: {
  actorUid: string
  actorName?: string | null
  existingThemes: Array<FirestoreRecord<ThemeDocument>>
  items: ThemeImportComparable[]
  reservationsByNumber: Map<number, ThemeNumberReservationDocument>
  sourceLabel: string
}) {
  const existingThemesByNumber = new Map(
    existingThemes.map((theme) => [theme.number, theme]),
  )
  const operations: ThemeImportOperation[] = []
  let createdCount = 0
  let updatedCount = 0
  let unchangedCount = 0

  items.forEach((item) => {
    const existingTheme = existingThemesByNumber.get(item.number)

    if (!existingTheme) {
      const reservation = reservationsByNumber.get(item.number)

      if (reservation) {
        throw new Error(
          `A reserva do tema ${item.number} existe sem cadastro correspondente. Revise a base antes de importar novamente.`,
        )
      }

      const themeRef = doc(getThemesCollection())
      const reservationRef = getThemeNumberReservationRef(item.number)
      const now = Timestamp.now()
      const themeDocument: ThemeDocument = {
        ...item,
        notes: '',
        createdAt: now,
        updatedAt: now,
        createdBy: actorUid,
        updatedBy: actorUid,
      }

      operations.push({
        writeCount: 3,
        apply: (batch) => {
          batch.set(themeRef, themeDocument)
          batch.set(
            reservationRef,
            buildThemeNumberReservation(item.number, themeRef.id, now),
          )
          appendAuditLogToBatch(batch, {
            entityType: 'theme',
            entityId: themeRef.id,
            action: 'create',
            actorUid,
            actorName: actorName ?? null,
            before: null,
            after: toAuditSnapshot(themeDocument),
            metadata: {
              source: 'themes-pdf-import',
              importSourceLabel: sourceLabel,
              reservationNumber: item.number,
            },
            createdAt: now,
          })
        },
      })
      createdCount += 1
      return
    }

    const changedTheme: ThemeDocument = {
      ...stripRecordId(existingTheme),
      title: item.title,
      category: item.category,
      isActive: item.isActive,
      updatedAt: Timestamp.now(),
      updatedBy: actorUid,
    }
    const isChanged =
      existingTheme.title !== changedTheme.title ||
      existingTheme.category !== changedTheme.category ||
      existingTheme.isActive !== changedTheme.isActive

    if (!isChanged) {
      unchangedCount += 1
      return
    }

    operations.push({
      writeCount: 2,
      apply: (batch) => {
        batch.set(getThemeRef(existingTheme.id), changedTheme)
        appendAuditLogToBatch(batch, {
          entityType: 'theme',
          entityId: existingTheme.id,
          action: 'update',
          actorUid,
          actorName: actorName ?? null,
          before: toAuditSnapshot(existingTheme),
          after: toAuditSnapshot(changedTheme),
          metadata: {
            source: 'themes-pdf-import',
            importSourceLabel: sourceLabel,
            reservationNumber: item.number,
          },
          createdAt: changedTheme.updatedAt,
        })
      },
    })
    updatedCount += 1
  })

  return {
    operations,
    result: {
      createdCount,
      updatedCount,
      unchangedCount,
    } satisfies ImportThemesResult,
  }
}

async function commitThemeImportOperations(operations: ThemeImportOperation[]) {
  let batch = writeBatch(firebaseDb)
  let currentWriteCount = 0

  for (const operation of operations) {
    if (currentWriteCount + operation.writeCount > maxBatchWrites) {
      await batch.commit()
      batch = writeBatch(firebaseDb)
      currentWriteCount = 0
    }

    operation.apply(batch)
    currentWriteCount += operation.writeCount
  }

  if (currentWriteCount > 0) {
    await batch.commit()
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
    category: theme.category ?? defaultThemeFormValues.category,
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

export async function importThemes({
  items,
  actorUid,
  actorName,
  sourceLabel = 'S-99a_T',
}: ImportThemesInput): Promise<ImportThemesResult> {
  const normalizedItems = buildThemeImportItems(items)
  const [existingThemes, reservations] = await Promise.all([
    listThemesForManagement(),
    getTypedCollection(collection(firebaseDb, 'themeNumbers'), themeNumberReservationSchema),
  ])
  const reservationsByNumber = new Map(
    reservations.map((reservation) => [reservation.number, reservation]),
  )
  const { operations, result } = buildImportOperations({
    actorUid,
    actorName,
    existingThemes,
    items: normalizedItems,
    reservationsByNumber,
    sourceLabel: sourceLabel ?? 'S-99a_T',
  })

  if (operations.length === 0) {
    return result
  }

  await commitThemeImportOperations(operations)

  return result
}
