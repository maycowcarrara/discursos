import { useQuery } from '@tanstack/react-query'

import { listThemes } from '@/services/firestore/themes-service'

const themesQueryKey = ['firestore', 'themes', 'active-list'] as const

export function useThemesQuery() {
  return useQuery({
    queryKey: themesQueryKey,
    queryFn: listThemes,
  })
}
