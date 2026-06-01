import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createSpeaker,
  deleteSpeaker,
  getSpeakerById,
  listSpeakers,
  listSpeakersForManagement,
  updateSpeaker,
  type CreateSpeakerInput,
  type DeleteSpeakerInput,
  type UpdateSpeakerInput,
} from '@/services/firestore/speakers-service'

const speakersQueryKey = ['firestore', 'speakers', 'active-list'] as const
const speakersManagementQueryKey = [
  'firestore',
  'speakers',
  'management-list',
] as const

export function useSpeakersQuery() {
  return useQuery({
    queryKey: speakersQueryKey,
    queryFn: listSpeakers,
  })
}

export function useSpeakerByIdQuery(speakerId: string | null | undefined) {
  return useQuery({
    queryKey: ['firestore', 'speakers', 'by-id', speakerId],
    queryFn: async () => getSpeakerById(speakerId ?? ''),
    enabled: Boolean(speakerId),
  })
}

export function useSpeakersManagementQuery() {
  return useQuery({
    queryKey: speakersManagementQueryKey,
    queryFn: listSpeakersForManagement,
  })
}

async function invalidateSpeakerQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'speakers'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['firestore', 'auditLogs'],
    }),
  ])
}

export function useCreateSpeakerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSpeakerInput) => createSpeaker(input),
    onSuccess: async () => {
      await invalidateSpeakerQueries(queryClient)
    },
  })
}

export function useUpdateSpeakerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateSpeakerInput) => updateSpeaker(input),
    onSuccess: async () => {
      await invalidateSpeakerQueries(queryClient)
    },
  })
}

export function useDeleteSpeakerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteSpeakerInput) => deleteSpeaker(input),
    onSuccess: async () => {
      await invalidateSpeakerQueries(queryClient)
    },
  })
}
