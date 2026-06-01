import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCalendarEvent,
  deleteCalendarEvent,
  generateCalendarYear,
  listCalendarEventsByYear,
  listCalendarEventsByYearForManagement,
  updateCalendarEvent,
  type CreateCalendarEventInput,
  type DeleteCalendarEventInput,
  type GenerateCalendarYearInput,
  type UpdateCalendarEventInput,
} from '@/services/firestore/calendar-events-service'

export function useCalendarEventsQuery(year: number, enabled = true) {
  return useQuery({
    queryKey: ['firestore', 'calendarEvents', year],
    queryFn: () => listCalendarEventsByYear(year),
    enabled: Number.isFinite(year) && enabled,
  })
}

export function useCalendarEventsManagementQuery(year: number, enabled = true) {
  return useQuery({
    queryKey: ['firestore', 'calendarEvents', 'management', year],
    queryFn: () => listCalendarEventsByYearForManagement(year),
    enabled: Number.isFinite(year) && enabled,
  })
}

async function invalidateCalendarQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'calendarEvents'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'auditLogs'],
    }),
  ])
}

export function useCreateCalendarEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => createCalendarEvent(input),
    onSuccess: async () => {
      await invalidateCalendarQueries(queryClient)
    },
  })
}

export function useUpdateCalendarEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCalendarEventInput) => updateCalendarEvent(input),
    onSuccess: async () => {
      await invalidateCalendarQueries(queryClient)
    },
  })
}

export function useDeleteCalendarEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteCalendarEventInput) => deleteCalendarEvent(input),
    onSuccess: async () => {
      await invalidateCalendarQueries(queryClient)
    },
  })
}

export function useGenerateCalendarYearMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GenerateCalendarYearInput) => generateCalendarYear(input),
    onSuccess: async () => {
      await invalidateCalendarQueries(queryClient)
    },
  })
}
