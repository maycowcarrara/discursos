import { useQuery } from '@tanstack/react-query'

import { listRecentAuditLogs } from '@/services/firestore/audit-logs-service'

export function useRecentAuditLogsQuery(maxItems: number) {
  return useQuery({
    queryKey: ['firestore', 'auditLogs', 'recent', maxItems],
    queryFn: () => listRecentAuditLogs(maxItems),
    enabled: maxItems > 0,
  })
}
