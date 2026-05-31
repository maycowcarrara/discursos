import { useQuery } from '@tanstack/react-query'

import { listNotificationsByStatus } from '@/services/firestore/notifications-service'
import type { NotificationStatus } from '@/types/firestore'

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
