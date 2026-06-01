import {
  Timestamp,
  collection,
  doc,
  limit,
  orderBy,
  query,
  type DocumentData,
  type DocumentReference,
  type Transaction,
  type WriteBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase-db'
import {
  auditLogSchema,
  type AuditLogDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export type AppendAuditLogToBatchInput = Omit<AuditLogDocument, 'createdAt'> & {
  createdAt?: Timestamp
}

type AuditLogWriteTarget = {
  set: (
    documentRef: DocumentReference<DocumentData>,
    data: AuditLogDocument,
  ) => unknown
}

function appendAuditLog(
  target: AuditLogWriteTarget,
  { createdAt, ...payload }: AppendAuditLogToBatchInput,
) {
  const auditLogRef = doc(collection(firebaseDb, 'auditLogs'))

  target.set(auditLogRef, {
    ...payload,
    createdAt: createdAt ?? Timestamp.now(),
  })
}

export function appendAuditLogToBatch(
  batch: WriteBatch,
  payload: AppendAuditLogToBatchInput,
) {
  appendAuditLog(batch, payload)
}

export function appendAuditLogToTransaction(
  transaction: Transaction,
  payload: AppendAuditLogToBatchInput,
) {
  appendAuditLog(transaction, payload)
}

export async function listRecentAuditLogs(
  maxItems: number,
): Promise<Array<FirestoreRecord<AuditLogDocument>>> {
  const auditLogsQuery = query(
    collection(firebaseDb, 'auditLogs'),
    orderBy('createdAt', 'desc'),
    limit(maxItems),
  )

  return getTypedCollection(auditLogsQuery, auditLogSchema)
}
