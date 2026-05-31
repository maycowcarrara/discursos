import { collection, limit, orderBy, query } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  auditLogSchema,
  type AuditLogDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

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
