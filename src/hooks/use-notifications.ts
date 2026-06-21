import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getNotificationById,
  listNotificationsByIds,
  listNotificationsByStatus,
  subscribeToNotificationById,
  subscribeToNotificationsByIds,
} from '@/services/firestore/notifications-service'
import type { NotificationStatus } from '@/types/firestore'

export function useNotificationByIdQuery(id: string, enabled = true) {
  const queryClient = useQueryClient()
  const normalizedId = id.trim()
  const queryKey = ['firestore', 'notifications', 'id', normalizedId] as const
  const isEnabled = enabled && normalizedId.length > 0
  const notificationQuery = useQuery({
    queryKey,
    queryFn: () => getNotificationById(normalizedId),
    enabled: isEnabled,
  })

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    return subscribeToNotificationById(
      normalizedId,
      (notification) =>
        queryClient.setQueryData(
          ['firestore', 'notifications', 'id', normalizedId],
          notification,
        ),
      (error) => console.error('Falha ao acompanhar notificação.', error),
    )
  }, [isEnabled, normalizedId, queryClient])

  return notificationQuery
}

export function useNotificationsByIdsQuery(ids: string[], enabled = true) {
  const normalizedIds = Array.from(
    new Set(ids.map((item) => item.trim()).filter(Boolean)),
  ).sort()
  const normalizedIdsKey = normalizedIds.join('\u001f')
  const queryClient = useQueryClient()
  const isEnabled = enabled && normalizedIds.length > 0
  const notificationsQuery = useQuery({
    queryKey: ['firestore', 'notifications', 'ids', normalizedIds],
    queryFn: () => listNotificationsByIds(normalizedIds),
    enabled: isEnabled,
  })

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    const subscriptionIds = normalizedIdsKey.split('\u001f')
    const queryKey = ['firestore', 'notifications', 'ids', subscriptionIds] as const

    return subscribeToNotificationsByIds(
      subscriptionIds,
      (notifications) => queryClient.setQueryData(queryKey, notifications),
      (error) => console.error('Falha ao acompanhar notificações.', error),
    )
  }, [isEnabled, normalizedIdsKey, queryClient])

  return notificationsQuery
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
