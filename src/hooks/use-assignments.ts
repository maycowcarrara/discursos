import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  confirmAssignment,
  createAssignment,
  listAssignmentHistory,
  listAssignmentHistoryPage,
  listAssignmentsByYear,
  listAssignmentsByYearPage,
  listRecentAssignments,
  requestManualAssignmentConfirmationEmail,
  updateAssignment,
  type AssignmentHistoryCursor,
  type AssignmentYearCursor,
  type ConfirmAssignmentInput,
  type CreateAssignmentInput,
  type ListAssignmentHistoryInput,
  type RequestManualAssignmentConfirmationEmailInput,
  type UpdateAssignmentInput,
} from '@/services/firestore/assignments-service'
import { processManualNotificationImmediately } from '@/services/notifications/email-delivery-service'

export function useAssignmentsByYearQuery(year: number, enabled = true) {
  return useQuery({
    queryKey: ['firestore', 'assignments', 'year', year],
    queryFn: () => listAssignmentsByYear(year),
    enabled: Number.isFinite(year) && enabled,
  })
}

export function useAssignmentsByYearInfiniteQuery(
  year: number,
  pageSize = 40,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['firestore', 'assignments', 'yearPage', year, pageSize],
    initialPageParam: null as AssignmentYearCursor | null,
    queryFn: ({ pageParam }) =>
      listAssignmentsByYearPage({
        year,
        cursor: pageParam,
        pageSize,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
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

export function useAssignmentHistoryQuery(
  filters: ListAssignmentHistoryInput,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      'firestore',
      'assignments',
      'history',
      'full',
      filters.periodStart ?? null,
      filters.periodEnd ?? null,
    ],
    queryFn: () => listAssignmentHistory(filters),
    enabled,
  })
}

export function useAssignmentHistoryInfiniteQuery(
  filters: ListAssignmentHistoryInput,
  pageSize = 40,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: [
      'firestore',
      'assignments',
      'history',
      filters.periodStart ?? null,
      filters.periodEnd ?? null,
      pageSize,
    ],
    initialPageParam: null as AssignmentHistoryCursor | null,
    queryFn: ({ pageParam }) =>
      listAssignmentHistoryPage({
        ...filters,
        cursor: pageParam,
        pageSize,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled,
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
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'notifications'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'dashboard'],
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

export function useRequestManualAssignmentConfirmationEmailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RequestManualAssignmentConfirmationEmailInput) => {
      const delivery = await requestManualAssignmentConfirmationEmail(input)

      return processManualNotificationImmediately(delivery)
    },
    onSettled: async () => {
      await invalidateAssignmentQueries(queryClient)
    },
  })
}
