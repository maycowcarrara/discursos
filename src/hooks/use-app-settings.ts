import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getAppSettings,
  saveAppSettings,
  type SaveAppSettingsInput,
} from '@/services/firestore/settings-service'

const appSettingsQueryKey = ['firestore', 'settings', 'app'] as const

export function useAppSettingsQuery() {
  return useQuery({
    queryKey: appSettingsQueryKey,
    queryFn: getAppSettings,
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
