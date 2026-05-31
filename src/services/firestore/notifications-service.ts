import { collection, limit, orderBy, query, where } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  notificationSchema,
  type FirestoreRecord,
  type NotificationDocument,
  type NotificationStatus,
} from '@/types/firestore'

import { getTypedCollection } from './shared'

export async function listNotificationsByStatus(
  status: NotificationStatus,
  maxItems: number,
): Promise<Array<FirestoreRecord<NotificationDocument>>> {
  const notificationsQuery = query(
    collection(firebaseDb, 'notifications'),
    where('status', '==', status),
    orderBy('scheduledFor', 'asc'),
    limit(maxItems),
  )

  return getTypedCollection(notificationsQuery, notificationSchema)
}
