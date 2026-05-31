import { useQuery } from '@tanstack/react-query'

import {
  listAssignmentsByYear,
  listRecentAssignments,
} from '@/services/firestore/assignments-service'

export function useAssignmentsByYearQuery(year: number) {
  return useQuery({
    queryKey: ['firestore', 'assignments', 'year', year],
    queryFn: () => listAssignmentsByYear(year),
    enabled: Number.isFinite(year),
  })
}

export function useRecentAssignmentsQuery(maxItems: number) {
  return useQuery({
    queryKey: ['firestore', 'assignments', 'recent', maxItems],
    queryFn: () => listRecentAssignments(maxItems),
    enabled: maxItems > 0,
  })
}
