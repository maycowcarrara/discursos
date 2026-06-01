import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addAdminUser,
  getAdminUsers,
  removeAdminUser,
} from '@/services/auth/admin-access-service'

const adminUsersQueryKey = ['worker', 'adminUsers'] as const

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: adminUsersQueryKey,
    queryFn: getAdminUsers,
  })
}

export function useAddAdminUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addAdminUser,
    onSuccess: (users) => {
      queryClient.setQueryData(adminUsersQueryKey, users)
    },
  })
}

export function useRemoveAdminUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeAdminUser,
    onSuccess: (users) => {
      queryClient.setQueryData(adminUsersQueryKey, users)
    },
  })
}
