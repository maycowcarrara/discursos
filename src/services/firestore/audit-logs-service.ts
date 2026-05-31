import {
  Timestamp,
  collection,
  doc,
  limit,
  orderBy,
  query,
  type WriteBatch,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  auditLogSchema,
  type AuditLogDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export type AppendAuditLogToBatchInput = Omit<AuditLogDocument, 'createdAt'> & {
  createdAt?: Timestamp
}

export function appendAuditLogToBatch(
  batch: WriteBatch,
  { createdAt, ...payload }: AppendAuditLogToBatchInput,
) {
  const auditLogRef = doc(collection(firebaseDb, 'auditLogs'))

  batch.set(auditLogRef, {
    ...payload,
    createdAt: createdAt ?? Timestamp.now(),
  })
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
