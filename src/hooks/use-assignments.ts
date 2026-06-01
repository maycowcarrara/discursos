import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  confirmAssignment,
  createAssignment,
  listAssignmentsByYear,
  listRecentAssignments,
  updateAssignment,
  type ConfirmAssignmentInput,
  type CreateAssignmentInput,
  type UpdateAssignmentInput,
} from '@/services/firestore/assignments-service'

export function useAssignmentsByYearQuery(year: number, enabled = true) {
  return useQuery({
    queryKey: ['firestore', 'assignments', 'year', year],
    queryFn: () => listAssignmentsByYear(year),
    enabled: Number.isFinite(year) && enabled,
  })
}

export function useRecentAssignmentsQuery(maxItems: number) {
  return useQuery({
    queryKey: ['firestore', 'assignments', 'recent', maxItems],
    queryFn: () => listRecentAssignments(maxItems),
    enabled: maxItems > 0,
  })
}

async function invalidateAssignmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'assignments'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'calendarEvents'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'auditLogs'],
    }),
  ])
}

export function useCreateAssignmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => createAssignment(input),
    onSuccess: async () => {
      await invalidateAssignmentQueries(queryClient)
    },
  })
}

export function useUpdateAssignmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAssignmentInput) => updateAssignment(input),
    onSuccess: async () => {
      await invalidateAssignmentQueries(queryClient)
    },
  })
}

export function useConfirmAssignmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ConfirmAssignmentInput) => confirmAssignment(input),
    onSuccess: async () => {
      await invalidateAssignmentQueries(queryClient)
    },
  })
}
