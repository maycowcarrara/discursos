import { useQuery } from '@tanstack/react-query'

import {
  getNotificationById,
  listNotificationsByIds,
  listNotificationsByStatus,
} from '@/services/firestore/notifications-service'
import type { NotificationStatus } from '@/types/firestore'

export function useNotificationByIdQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: ['firestore', 'notifications', 'id', id],
    queryFn: () => getNotificationById(id),
    enabled: enabled && id.trim().length > 0,
  })
}

export function useNotificationsByIdsQuery(ids: string[], enabled = true) {
  const normalizedIds = Array.from(
    new Set(ids.map((item) => item.trim()).filter(Boolean)),
  ).sort()

  return useQuery({
    queryKey: ['firestore', 'notifications', 'ids', normalizedIds],
    queryFn: () => listNotificationsByIds(normalizedIds),
    enabled: enabled && normalizedIds.length > 0,
  })
}

export function useNotificationsByStatusQuery(
  status: NotificationStatus,
  maxItems: number,
) {
  return useQuery({
    queryKey: ['firestore', 'notifications', status, maxItems],
    queryFn: () => listNotificationsByStatus(status, maxItems),
    enabled: maxItems > 0,
  })
}
