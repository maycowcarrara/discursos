import { useQuery } from '@tanstack/react-query'

import { listSpeakers } from '@/services/firestore/speakers-service'

const speakersQueryKey = ['firestore', 'speakers', 'active-list'] as const

export function useSpeakersQuery() {
  return useQuery({
    queryKey: speakersQueryKey,
    queryFn: listSpeakers,
  })
}
