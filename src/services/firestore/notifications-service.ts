import {
  collection,
  doc,
  documentId,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase-db'
import {
  notificationSchema,
  type FirestoreRecord,
  type NotificationDocument,
  type NotificationStatus,
} from '@/types/firestore'

import { getTypedCollection, getTypedDocument } from './shared'

export async function getNotificationById(
  id: string,
): Promise<FirestoreRecord<NotificationDocument> | null> {
  const notification = await getTypedDocument(
    doc(firebaseDb, 'notifications', id),
    notificationSchema,
  )

  if (!notification) {
    return null
  }

  return notification
}

export async function listNotificationsByIds(
  ids: string[],
): Promise<Array<FirestoreRecord<NotificationDocument>>> {
  const normalizedIds = Array.from(
    new Set(ids.map((item) => item.trim()).filter(Boolean)),
  )

  if (normalizedIds.length === 0) {
    return []
  }

  const notifications: Array<FirestoreRecord<NotificationDocument>> = []

  for (let index = 0; index < normalizedIds.length; index += 10) {
    const currentChunk = normalizedIds.slice(index, index + 10)
    const notificationsQuery = query(
      collection(firebaseDb, 'notifications'),
      where(documentId(), 'in', currentChunk),
    )

    notifications.push(
      ...(await getTypedCollection(notificationsQuery, notificationSchema)),
    )
  }

  return notifications
}

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
