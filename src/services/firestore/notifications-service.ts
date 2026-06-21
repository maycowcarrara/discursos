import {
  collection,
  doc,
  documentId,
  limit,
  onSnapshot,
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

export function subscribeToNotificationById(
  id: string,
  onValue: (notification: FirestoreRecord<NotificationDocument> | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(firebaseDb, 'notifications', id),
    (snapshot) => {
      onValue(
        snapshot.exists()
          ? {
              id: snapshot.id,
              ...notificationSchema.parse(snapshot.data()),
            }
          : null,
      )
    },
    onError,
  )
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

export function subscribeToNotificationsByIds(
  ids: string[],
  onValue: (notifications: Array<FirestoreRecord<NotificationDocument>>) => void,
  onError: (error: Error) => void,
) {
  const normalizedIds = Array.from(
    new Set(ids.map((item) => item.trim()).filter(Boolean)),
  )

  if (normalizedIds.length === 0) {
    onValue([])
    return () => undefined
  }

  const chunks = Array.from(
    { length: Math.ceil(normalizedIds.length / 10) },
    (_, index) => normalizedIds.slice(index * 10, index * 10 + 10),
  )
  const initializedChunks = new Set<number>()
  const notificationsByChunk = new Map<
    number,
    Array<FirestoreRecord<NotificationDocument>>
  >()

  const unsubscribers = chunks.map((currentChunk, chunkIndex) => {
    const notificationsQuery = query(
      collection(firebaseDb, 'notifications'),
      where(documentId(), 'in', currentChunk),
    )

    return onSnapshot(
      notificationsQuery,
      (snapshot) => {
        notificationsByChunk.set(
          chunkIndex,
          snapshot.docs.map((notificationSnapshot) => ({
            id: notificationSnapshot.id,
            ...notificationSchema.parse(notificationSnapshot.data()),
          })),
        )
        initializedChunks.add(chunkIndex)

        if (initializedChunks.size === chunks.length) {
          onValue(
            Array.from(notificationsByChunk.values())
              .flat()
              .sort((left, right) => left.id.localeCompare(right.id)),
          )
        }
      },
      onError,
    )
  })

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
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
