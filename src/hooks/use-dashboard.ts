import { useQuery } from '@tanstack/react-query'

import { getDashboardSnapshot } from '@/services/firestore/dashboard-service'
import { toLocalDateKey } from '@/utils/dashboard'

export function useDashboardSnapshotQuery(
  referenceDate: Date,
  meetingDayIndex: number | null = null,
  enabled = true,
) {
  const referenceDateKey = toLocalDateKey(referenceDate)

  return useQuery({
    queryKey: ['firestore', 'dashboard', referenceDateKey, meetingDayIndex],
    queryFn: () => getDashboardSnapshot(referenceDate, meetingDayIndex),
    enabled,
  })
}
