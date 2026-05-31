import { useQuery } from '@tanstack/react-query'

import { listCongregations } from '@/services/firestore/congregations-service'

const congregationsQueryKey = ['firestore', 'congregations', 'active-list'] as const

export function useCongregationsQuery() {
  return useQuery({
    queryKey: congregationsQueryKey,
    queryFn: listCongregations,
  })
}
