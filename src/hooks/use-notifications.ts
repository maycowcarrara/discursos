import { useQuery } from '@tanstack/react-query'

import {
  getNotificationById,
  listNotificationsByIds,
  listNotificationsByStatus,
} from '@/services/firestore/notifications-service'
import type { NotificationStatus } from '@/types/firestore'

export function useNotificationByIdQuery(id: string, enabled = true) {
  const normalizedId = id.trim()
  const queryKey = ['firestore', 'notifications', 'id', normalizedId] as const
  const isEnabled = enabled && normalizedId.length > 0

  return useQuery({
    queryKey,
    queryFn: () => getNotificationById(normalizedId),
    enabled: isEnabled,
  })
}

export function useNotificationsByIdsQuery(ids: string[], enabled = true) {
  const normalizedIds = Array.from(
    new Set(ids.map((item) => item.trim()).filter(Boolean)),
  ).sort()
  const isEnabled = enabled && normalizedIds.length > 0

  return useQuery({
    queryKey: ['firestore', 'notifications', 'ids', normalizedIds],
    queryFn: () => listNotificationsByIds(normalizedIds),
    enabled: isEnabled,
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
