import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createTheme,
  deleteTheme,
  importThemes,
  listThemes,
  listThemesForManagement,
  updateTheme,
  type CreateThemeInput,
  type DeleteThemeInput,
  type ImportThemesInput,
  type UpdateThemeInput,
} from '@/services/firestore/themes-service'

const themesQueryKey = ['firestore', 'themes', 'active-list'] as const
const themesManagementQueryKey = ['firestore', 'themes', 'management-list'] as const

export function useThemesQuery() {
  return useQuery({
    queryKey: themesQueryKey,
    queryFn: listThemes,
  })
}

export function useThemesManagementQuery() {
  return useQuery({
    queryKey: themesManagementQueryKey,
    queryFn: listThemesForManagement,
  })
}

async function invalidateThemeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'themes'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'auditLogs'],
    }),
  ])
}

export function useCreateThemeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateThemeInput) => createTheme(input),
    onSuccess: async () => {
      await invalidateThemeQueries(queryClient)
    },
  })
}

export function useUpdateThemeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateThemeInput) => updateTheme(input),
    onSuccess: async () => {
      await invalidateThemeQueries(queryClient)
    },
  })
}

export function useDeleteThemeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteThemeInput) => deleteTheme(input),
    onSuccess: async () => {
      await invalidateThemeQueries(queryClient)
    },
  })
}

export function useImportThemesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ImportThemesInput) => importThemes(input),
    onSuccess: async () => {
      await invalidateThemeQueries(queryClient)
    },
  })
}
