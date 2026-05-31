import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCongregation,
  deleteCongregation,
  listCongregations,
  updateCongregation,
  type CreateCongregationInput,
  type DeleteCongregationInput,
  type UpdateCongregationInput,
} from '@/services/firestore/congregations-service'

const congregationsQueryKey = ['firestore', 'congregations', 'active-list'] as const

export function useCongregationsQuery() {
  return useQuery({
    queryKey: congregationsQueryKey,
    queryFn: listCongregations,
  })
}

async function invalidateCongregationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'congregations'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'auditLogs'],
    }),
  ])
}

export function useCreateCongregationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCongregationInput) => createCongregation(input),
    onSuccess: async () => {
      await invalidateCongregationQueries(queryClient)
    },
  })
}

export function useUpdateCongregationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCongregationInput) => updateCongregation(input),
    onSuccess: async () => {
      await invalidateCongregationQueries(queryClient)
    },
  })
}

export function useDeleteCongregationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteCongregationInput) => deleteCongregation(input),
    onSuccess: async () => {
      await invalidateCongregationQueries(queryClient)
    },
  })
}
