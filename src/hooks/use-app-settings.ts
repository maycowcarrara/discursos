import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getAppSettings,
  getCalendarSettings,
  saveCalendarSettings,
  saveAppSettings,
  type SaveCalendarSettingsInput,
  type SaveAppSettingsInput,
} from '@/services/firestore/settings-service'

const appSettingsQueryKey = ['firestore', 'settings', 'app'] as const
const calendarSettingsQueryKey = ['firestore', 'settings', 'calendar'] as const

export function useAppSettingsQuery() {
  return useQuery({
    queryKey: appSettingsQueryKey,
    queryFn: getAppSettings,
  })
}

export function useCalendarSettingsQuery() {
  return useQuery({
    queryKey: calendarSettingsQueryKey,
    queryFn: getCalendarSettings,
  })
}

export function useSaveAppSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveAppSettingsInput) => saveAppSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: appSettingsQueryKey,
      })
    },
  })
}

export function useSaveCalendarSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveCalendarSettingsInput) => saveCalendarSettings(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: calendarSettingsQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: ['firestore', 'calendarEvents'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['firestore', 'auditLogs'],
        }),
      ])
    },
  })
}
