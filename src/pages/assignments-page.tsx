import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPinned,
  Mic2,
  PencilLine,
  Plus,
  Search,
  ShieldAlert,
  Speech,
  Undo2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { EmptyState } from '@/components/app/empty-state'
import { PageHeader } from '@/components/app/page-header'
import { SummaryStat } from '@/components/app/summary-stat'
import { useAuth } from '@/components/auth/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppSettingsQuery, useCalendarSettingsQuery } from '@/hooks/use-app-settings'
import {
  useAssignmentsByYearQuery,
  useConfirmAssignmentMutation,
  useCreateAssignmentMutation,
  useRecentAssignmentsQuery,
  useUpdateAssignmentMutation,
} from '@/hooks/use-assignments'
import {
  useCalendarEventsQuery,
  useRequestManualGoogleCalendarSyncMutation,
} from '@/hooks/use-calendar-events'
import { useCongregationsManagementQuery } from '@/hooks/use-congregations'
import { useSpeakersManagementQuery } from '@/hooks/use-speakers'
import { useThemesManagementQuery } from '@/hooks/use-themes'
import {
  defaultAssignmentFormValues,
  toAssignmentFormValues,
  type AssignmentFormValues,
} from '@/services/firestore/assignments-service'
import type {
  FirestoreRecord,
  AssignmentDocument,
  AssignmentStatus,
  CalendarEventDocument,
  SpeakerType,
} from '@/types/firestore'
import {
  getAssignmentMovementLabel,
  inferAssignmentMovementType,
  type AssignmentMovementType,
} from '@/utils/assignment-history'
import {
  assignmentStatusLabels,
  buildOperationalAssignmentMapByCalendarEventId,
  calendarEventTypeLabels,
  formatTimestampDate,
  isAssignmentCoveringCalendarSlot,
} from '@/utils/calendar-events'

const currentYear = new Date().getFullYear()

const selectClassName =
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70'

const assignmentFormSchema = z.object({
  calendarEventId: z.string().trim().min(1, 'Selecione o evento da designação.'),
  localCongregationId: z
    .string()
    .trim()
    .min(1, 'Selecione a congregação que receberá o discurso.'),
  speakerId: z.string().trim().min(1, 'Selecione o orador.'),
  themeId: z.string().trim().min(1, 'Selecione o tema.'),
  status: z.enum(['pending', 'confirmed', 'declined', 'cancelled', 'replaced']),
  notes: z.string().trim(),
})

type FeedbackState =
  | {
      tone: 'success' | 'error'
      message: string
    }
  | null

type MovementType = AssignmentMovementType
type GoogleCalendarSyncTone = 'error' | 'neutral' | 'success' | 'warning'

type GoogleCalendarSyncState = {
  canRequestSync: boolean
  canShowAction: boolean
  description: string
  label: string
  tone: GoogleCalendarSyncTone
}

const movementOptions: Array<{
  value: MovementType
  title: string
  description: string
}> = [
  {
    value: 'incoming',
    title: 'Orador visitante',
    description: 'Orador visitante designado para falar em uma congregação local.',
  },
  {
    value: 'outgoing',
    title: 'Discurso fora',
    description: 'Um orador local designado para atender uma congregação parceira.',
  },
  {
    value: 'local',
    title: 'Designação local',
    description: 'O orador local permanece falando dentro da própria congregação.',
  },
]

const editableStatusOptions: Array<{
  value: AssignmentStatus
  title: string
  description: string
}> = [
  {
    value: 'pending',
    title: 'Pendente',
    description: 'A designação foi montada, mas ainda aguarda resposta.',
  },
  {
    value: 'confirmed',
    title: 'Confirmado',
    description: 'Retorno recebido e agenda pronta para operar com seguranca.',
  },
  {
    value: 'declined',
    title: 'Recusado',
    description: 'O orador não aceitou e a data precisa ser reorganizada.',
  },
  {
    value: 'cancelled',
    title: 'Cancelado',
    description: 'O registro permanece no histórico, mas sai da operação atual.',
  },
  {
    value: 'replaced',
    title: 'Substituído',
    description: 'Fica preservado apenas como trilha da troca realizada.',
  },
]

const creatableStatusValues: AssignmentStatus[] = ['pending', 'confirmed']

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível concluir a operação em designações.'
}

function getFeedbackContainerClassName(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function getStatusClassName(status: AssignmentStatus) {
  if (status === 'confirmed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (status === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  }

  if (status === 'replaced') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'
  }

  return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function formatUpdatedAt(value: Date) {
  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getPreferredMovementType(options: {
  hasLocalCongregations: boolean
  hasPartnerCongregations: boolean
  hasLocalSpeakers: boolean
  hasVisitorSpeakers: boolean
}): MovementType {
  if (options.hasLocalCongregations && options.hasVisitorSpeakers) {
    return 'incoming'
  }

  if (options.hasPartnerCongregations && options.hasLocalSpeakers) {
    return 'outgoing'
  }

  return 'local'
}

function getSpeakerTypeForMovement(movementType: MovementType): SpeakerType {
  return movementType === 'incoming' ? 'visitor' : 'local'
}

function buildCreateFormValues(
  movementType: MovementType,
  destinationId: string,
): AssignmentFormValues {
  return {
    ...defaultAssignmentFormValues,
    localCongregationId: destinationId,
    status: movementType === 'local' ? 'confirmed' : 'pending',
  }
}

function isGoogleCalendarCandidateMovement(movementType: MovementType) {
  return movementType === 'incoming' || movementType === 'outgoing'
}

function buildGoogleCalendarActionOwnerMapByCalendarEventId(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
) {
  const sortedAssignments = [...assignments]
    .sort((left, right) => {
      const updatedAtDifference = right.updatedAt.toMillis() - left.updatedAt.toMillis()

      if (updatedAtDifference !== 0) {
        return updatedAtDifference
      }

      return right.createdAt.toMillis() - left.createdAt.toMillis()
    })

  return sortedAssignments.reduce((assignmentMap, assignment) => {
    const existingAssignment = assignmentMap.get(assignment.calendarEventId)

    if (!existingAssignment) {
      assignmentMap.set(assignment.calendarEventId, assignment)
      return assignmentMap
    }

    if (
      !isAssignmentCoveringCalendarSlot(existingAssignment.status) &&
      isAssignmentCoveringCalendarSlot(assignment.status)
    ) {
      assignmentMap.set(assignment.calendarEventId, assignment)
    }

    return assignmentMap
  }, new Map<string, FirestoreRecord<AssignmentDocument>>())
}

function getGoogleCalendarSyncBadgeClassName(tone: GoogleCalendarSyncTone) {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  }

  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
  }

  return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'
}

function buildAssignmentSaveFeedbackMessage(baseMessage: string, movementType: MovementType) {
  if (!isGoogleCalendarCandidateMovement(movementType)) {
    return baseMessage
  }

  return `${baseMessage} Use "Sincronizar com agenda" quando quiser refletir isso no Google Calendar.`
}

function GoogleCalendarButtonMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 12.23c0-.72-.06-1.25-.19-1.8H12v3.4h5.18c-.1.85-.66 2.14-1.9 3l-.02.11 2.72 2.11.19.02c1.79-1.65 2.83-4.07 2.83-6.84Z" fill="#4285F4" />
      <path d="M12 21c2.53 0 4.65-.84 6.2-2.28l-2.96-2.3c-.79.55-1.85.94-3.24.94-2.48 0-4.58-1.64-5.33-3.92l-.1.01-2.83 2.19-.04.1C5.24 18.82 8.37 21 12 21Z" fill="#34A853" />
      <path d="M6.67 13.44A5.4 5.4 0 0 1 6.36 12c0-.5.09-.99.24-1.44l-.01-.12-2.87-2.23-.09.04A9 9 0 0 0 3 12c0 1.45.34 2.81.94 4.02l2.73-2.58Z" fill="#FBBC05" />
      <path d="M12 6.64c1.76 0 2.95.76 3.62 1.39l2.64-2.58C16.64 3.95 14.53 3 12 3 8.37 3 5.24 5.18 3.84 8.26l2.97 2.3c.76-2.28 2.86-3.92 5.19-3.92Z" fill="#EA4335" />
    </svg>
  )
}

function getAssignmentGoogleCalendarSyncState(options: {
  assignment: FirestoreRecord<AssignmentDocument>
  calendarEvent: FirestoreRecord<CalendarEventDocument> | null
  calendarSettingsEnabled: boolean
  calendarSettingsUpdatedAt: Date | null
  isLatestAssignmentForEvent: boolean
  movementType: MovementType
}): GoogleCalendarSyncState | null {
  if (!options.isLatestAssignmentForEvent) {
    return null
  }

  if (!options.calendarEvent) {
    return isGoogleCalendarCandidateMovement(options.movementType)
      ? {
          canRequestSync: false,
          canShowAction: false,
          description: 'O evento da agenda não foi encontrado para esta designação.',
          label: 'Evento indisponível',
          tone: 'error',
        }
      : null
  }

  const isCandidateMovement = isGoogleCalendarCandidateMovement(options.movementType)
  const syncStatus = options.calendarEvent.googleCalendarSyncStatus ?? 'synced'
  const hasRemoteEvent = Boolean(
    options.calendarEvent.googleCalendarEventId &&
      options.calendarEvent.googleCalendarCalendarId,
  )
  const manualRequestAt =
    options.calendarEvent.googleCalendarManualSyncRequestedAt?.toMillis() ?? 0
  const lastSyncAt = options.calendarEvent.googleCalendarSyncUpdatedAt?.toMillis() ?? 0
  const lastRelevantChangeAt = Math.max(
    options.calendarSettingsUpdatedAt?.getTime() ?? 0,
    options.assignment.updatedAt.toMillis(),
    options.calendarEvent.updatedAt.toMillis(),
  )
  const hasFreshManualRequest = manualRequestAt >= lastRelevantChangeAt
  const isOperational = isAssignmentCoveringCalendarSlot(options.assignment.status)
  const hasUnsyncedLocalChanges = !hasFreshManualRequest || lastRelevantChangeAt > lastSyncAt
  const needsManualPublish =
    isCandidateMovement &&
    isOperational &&
    (!hasRemoteEvent || hasUnsyncedLocalChanges)
  const needsManualRemoval =
    (!isOperational || !isCandidateMovement) &&
    hasRemoteEvent &&
    hasUnsyncedLocalChanges

  if (!isCandidateMovement && !hasRemoteEvent) {
    return null
  }

  if (!options.calendarSettingsEnabled) {
    return {
      canRequestSync: false,
      canShowAction: true,
      description: 'Ative a integração nas configurações antes de publicar ou remover este item na agenda.',
      label: 'Integração desligada',
      tone: 'warning',
    }
  }

  if (hasFreshManualRequest && syncStatus === 'pending') {
    return {
      canRequestSync: false,
      canShowAction: true,
      description: 'Este item já entrou na fila manual e será processado em breve.',
      label: 'Na fila de sincronização',
      tone: 'warning',
    }
  }

  if (hasFreshManualRequest && syncStatus === 'error') {
    return {
      canRequestSync: true,
      canShowAction: true,
      description:
        options.calendarEvent.googleCalendarSyncError?.trim() ||
        'A última tentativa falhou. Revise os dados e tente sincronizar novamente.',
      label: 'Erro de sincronização',
      tone: 'error',
    }
  }

  if (needsManualRemoval) {
    return {
      canRequestSync: true,
      canShowAction: true,
      description: 'A agenda externa ainda precisa remover a publicação anterior deste evento.',
      label: 'Remoção pendente',
      tone: 'warning',
    }
  }

  if (needsManualPublish) {
    return {
      canRequestSync: true,
      canShowAction: true,
      description: hasRemoteEvent
        ? 'A agenda externa ainda não recebeu esta atualização mais recente.'
        : 'Esta designação já pode ser enviada para a agenda externa.',
      label: hasRemoteEvent
        ? 'Atualização pronta'
        : 'Pronto para enviar',
      tone: 'neutral',
    }
  }

  if (hasFreshManualRequest && hasRemoteEvent && syncStatus === 'synced') {
    return {
      canRequestSync: true,
      canShowAction: true,
      description: 'A agenda externa já está alinhada com a versão atual deste item.',
      label: 'Agenda atualizada',
      tone: 'success',
    }
  }

  return null
}

export function AssignmentsPage() {
  const { user } = useAuth()
  const [referenceNow] = useState(() => Date.now())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all')
  const [movementFilter, setMovementFilter] = useState<'all' | MovementType>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [movementTypeOverride, setMovementTypeOverride] = useState<MovementType | null>(
    null,
  )

  const appSettingsQuery = useAppSettingsQuery()
  const calendarSettingsQuery = useCalendarSettingsQuery()
  const activeYear = appSettingsQuery.data?.defaultYear ?? currentYear
  const assignmentsQuery = useAssignmentsByYearQuery(activeYear)
  const recentAssignmentsQuery = useRecentAssignmentsQuery(24)
  const calendarEventsQuery = useCalendarEventsQuery(activeYear)
  const congregationsQuery = useCongregationsManagementQuery()
  const speakersQuery = useSpeakersManagementQuery()
  const themesQuery = useThemesManagementQuery()
  const createAssignmentMutation = useCreateAssignmentMutation()
  const updateAssignmentMutation = useUpdateAssignmentMutation()
  const confirmAssignmentMutation = useConfirmAssignmentMutation()
  const requestManualGoogleCalendarSyncMutation = useRequestManualGoogleCalendarSyncMutation()

  const assignments = useMemo(
    () =>
      [...(assignmentsQuery.data ?? [])].sort((left, right) => {
        const eventDateDifference = right.eventDate.toMillis() - left.eventDate.toMillis()

        if (eventDateDifference !== 0) {
          return eventDateDifference
        }

        return right.updatedAt.toMillis() - left.updatedAt.toMillis()
      }),
    [assignmentsQuery.data],
  )
  const recentAssignments = useMemo(
    () =>
      [...(recentAssignmentsQuery.data ?? [])].sort((left, right) => {
        const eventDateDifference = right.eventDate.toMillis() - left.eventDate.toMillis()

        if (eventDateDifference !== 0) {
          return eventDateDifference
        }

        return right.updatedAt.toMillis() - left.updatedAt.toMillis()
      }),
    [recentAssignmentsQuery.data],
  )
  const eligibleEvents = useMemo(
    () =>
      (calendarEventsQuery.data ?? []).filter((event) => !event.blocksAssignments && event.isActive),
    [calendarEventsQuery.data],
  )
  const congregationsById = useMemo(
    () => new Map((congregationsQuery.data ?? []).map((item) => [item.id, item])),
    [congregationsQuery.data],
  )
  const calendarEventsById = useMemo(
    () => new Map((calendarEventsQuery.data ?? []).map((item) => [item.id, item])),
    [calendarEventsQuery.data],
  )
  const speakersById = useMemo(
    () => new Map((speakersQuery.data ?? []).map((item) => [item.id, item])),
    [speakersQuery.data],
  )
  const themesById = useMemo(
    () => new Map((themesQuery.data ?? []).map((item) => [item.id, item])),
    [themesQuery.data],
  )
  const operationalAssignmentMap = useMemo(
    () => buildOperationalAssignmentMapByCalendarEventId(assignments),
    [assignments],
  )
  const googleCalendarActionOwnerByCalendarEventId = useMemo(
    () => buildGoogleCalendarActionOwnerMapByCalendarEventId(assignments),
    [assignments],
  )
  const localCongregations = useMemo(
    () => (congregationsQuery.data ?? []).filter((item) => item.isActive && item.isLocal),
    [congregationsQuery.data],
  )
  const partnerCongregations = useMemo(
    () => (congregationsQuery.data ?? []).filter((item) => item.isActive && !item.isLocal),
    [congregationsQuery.data],
  )
  const localSpeakers = useMemo(
    () =>
      (speakersQuery.data ?? []).filter((item) => item.isActive && item.type === 'local'),
    [speakersQuery.data],
  )
  const visitorSpeakers = useMemo(
    () =>
      (speakersQuery.data ?? []).filter((item) => item.isActive && item.type === 'visitor'),
    [speakersQuery.data],
  )

  const preferredMovementType = useMemo(
    () =>
      getPreferredMovementType({
        hasLocalCongregations: localCongregations.length > 0,
        hasPartnerCongregations: partnerCongregations.length > 0,
        hasLocalSpeakers: localSpeakers.length > 0,
        hasVisitorSpeakers: visitorSpeakers.length > 0,
    }),
    [localCongregations.length, localSpeakers.length, partnerCongregations.length, visitorSpeakers.length],
  )
  const movementType = movementTypeOverride ?? preferredMovementType
  const defaultDestinationIds = useMemo(
    () => ({
      incoming: localCongregations[0]?.id ?? '',
      outgoing: partnerCongregations[0]?.id ?? '',
      local: localCongregations[0]?.id ?? '',
    }),
    [localCongregations, partnerCongregations],
  )

  const nextOpenEvent = useMemo(() => {
    const futureOpenEvent = eligibleEvents.find(
      (event) =>
        event.date.toMillis() >= referenceNow &&
        !operationalAssignmentMap.has(event.id),
    )

    if (futureOpenEvent) {
      return futureOpenEvent
    }

    return (
      eligibleEvents.find((event) => !operationalAssignmentMap.has(event.id)) ??
      eligibleEvents[0] ??
      null
    )
  }, [eligibleEvents, operationalAssignmentMap, referenceNow])

  const editingAssignment =
    assignments.find((assignment) => assignment.id === editingId) ?? null
  const actorName = user?.displayName ?? user?.email ?? null

  function getDefaultDestinationId(nextMovementType: MovementType) {
    return defaultDestinationIds[nextMovementType]
  }

  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: buildCreateFormValues(
      preferredMovementType,
      getDefaultDestinationId(preferredMovementType),
    ),
  })

  const watchedCalendarEventId =
    useWatch({
      control,
      name: 'calendarEventId',
    }) ?? ''
  const watchedLocalCongregationId =
    useWatch({
      control,
      name: 'localCongregationId',
    }) ?? ''
  const watchedSpeakerId =
    useWatch({
      control,
      name: 'speakerId',
    }) ?? ''
  const watchedThemeId =
    useWatch({
      control,
      name: 'themeId',
    }) ?? ''
  const watchedStatus =
    useWatch({
      control,
      name: 'status',
    }) ?? 'pending'

  const destinationOptions = useMemo(
    () =>
      (congregationsQuery.data ?? []).filter((congregation) => {
        const matchesMovement =
          movementType === 'outgoing' ? !congregation.isLocal : congregation.isLocal

        return (
          matchesMovement &&
          (congregation.isActive || congregation.id === watchedLocalCongregationId)
        )
      }),
    [congregationsQuery.data, movementType, watchedLocalCongregationId],
  )
  const speakerOptions = useMemo(
    () =>
      (speakersQuery.data ?? []).filter(
        (speaker) =>
          speaker.type === getSpeakerTypeForMovement(movementType) &&
          (speaker.isActive || speaker.id === watchedSpeakerId),
      ),
    [movementType, speakersQuery.data, watchedSpeakerId],
  )

  const selectedEvent =
    eligibleEvents.find((event) => event.id === watchedCalendarEventId) ?? null
  const selectedSpeaker = speakersById.get(watchedSpeakerId) ?? null
  const selectedSpeakerMissingEmail = Boolean(
    selectedSpeaker && selectedSpeaker.email.trim().length === 0,
  )
  const selectedDestinationCongregation =
    congregationsById.get(watchedLocalCongregationId) ?? null
  const speakerThemeOptions = useMemo(() => {
    if (!selectedSpeaker) {
      return []
    }

    return (themesQuery.data ?? []).filter(
      (theme) =>
        selectedSpeaker.themeIds.includes(theme.id) &&
        (theme.isActive || theme.id === watchedThemeId),
    )
  }, [selectedSpeaker, themesQuery.data, watchedThemeId])

  const currentOperationalAssignment = selectedEvent
    ? operationalAssignmentMap.get(selectedEvent.id) ?? null
    : null
  const selectedEventCoveredByOtherAssignment = Boolean(
    currentOperationalAssignment &&
      currentOperationalAssignment.id !== editingId &&
      isAssignmentCoveringCalendarSlot(currentOperationalAssignment.status),
  )
  const willReplaceCurrentAssignment =
    !editingAssignment &&
    selectedEventCoveredByOtherAssignment &&
    isAssignmentCoveringCalendarSlot(watchedStatus)

  const recentThemeUsage = useMemo(() => {
    if (!watchedThemeId) {
      return null
    }

    const selectedEventTime = selectedEvent?.date.toMillis() ?? Number.POSITIVE_INFINITY

    return recentAssignments.find(
      (assignment) =>
        assignment.id !== editingId &&
        assignment.themeId === watchedThemeId &&
        assignment.eventDate.toMillis() <= selectedEventTime,
    ) ?? null
  }, [editingId, recentAssignments, selectedEvent, watchedThemeId])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAssignments = assignments.filter((assignment) => {
    const movement = inferAssignmentMovementType(assignment, congregationsById)
    const matchesMovement = movementFilter === 'all' || movementFilter === movement
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter
    const searchableContent = [
      assignment.speakerName,
      assignment.originCongregationName,
      assignment.localCongregationName,
      assignment.themeTitle,
      String(assignment.themeNumber),
      assignment.notes,
    ]
      .join(' ')
      .toLowerCase()
    const matchesSearch =
      normalizedSearch.length === 0 || searchableContent.includes(normalizedSearch)

    return matchesMovement && matchesStatus && matchesSearch
  })

  const stats = useMemo(() => {
    const pending = assignments.filter((assignment) => assignment.status === 'pending').length
    const confirmed = assignments.filter((assignment) => assignment.status === 'confirmed').length
    const outgoing = assignments.filter(
      (assignment) =>
        inferAssignmentMovementType(assignment, congregationsById) === 'outgoing',
    ).length
    const openSlots = eligibleEvents.filter((event) => !operationalAssignmentMap.has(event.id)).length

    return {
      total: assignments.length,
      pending,
      confirmed,
      outgoing,
      openSlots,
    }
  }, [assignments, congregationsById, eligibleEvents, operationalAssignmentMap])

  const hasDestinations = destinationOptions.length > 0
  const hasSpeakerOptions = speakerOptions.length > 0
  const hasThemeOptions = speakerThemeOptions.length > 0
  const canSubmit =
    eligibleEvents.length > 0 &&
    hasDestinations &&
    hasSpeakerOptions &&
    (!selectedSpeaker || hasThemeOptions)
  const isSubmitting =
    createAssignmentMutation.isPending ||
    updateAssignmentMutation.isPending ||
    confirmAssignmentMutation.isPending ||
    requestManualGoogleCalendarSyncMutation.isPending

  const totalQueryErrors = [
    assignmentsQuery.error,
    recentAssignmentsQuery.error,
    calendarEventsQuery.error,
    calendarSettingsQuery.error,
    congregationsQuery.error,
    speakersQuery.error,
    themesQuery.error,
  ].filter(Boolean)

  useEffect(() => {
    if (editingAssignment || !nextOpenEvent || watchedCalendarEventId.length > 0) {
      return
    }

    setValue('calendarEventId', nextOpenEvent.id)
  }, [editingAssignment, nextOpenEvent, setValue, watchedCalendarEventId])

  useEffect(() => {
    if (editingAssignment || watchedLocalCongregationId.length > 0) {
      return
    }

    const defaultDestinationId = defaultDestinationIds[movementType]

    if (defaultDestinationId.length === 0) {
      return
    }

    setValue('localCongregationId', defaultDestinationId)
  }, [
    defaultDestinationIds,
    editingAssignment,
    movementType,
    setValue,
    watchedLocalCongregationId,
  ])

  useEffect(() => {
    if (watchedSpeakerId.length === 0) {
      return
    }

    const selectedSpeakerStillAllowed = speakerOptions.some(
      (speaker) => speaker.id === watchedSpeakerId,
    )

    if (!selectedSpeakerStillAllowed) {
      setValue('speakerId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      setValue('themeId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [setValue, speakerOptions, watchedSpeakerId])

  useEffect(() => {
    if (watchedLocalCongregationId.length === 0) {
      return
    }

    const selectedDestinationStillAllowed = destinationOptions.some(
      (congregation) => congregation.id === watchedLocalCongregationId,
    )

    if (!selectedDestinationStillAllowed) {
      setValue('localCongregationId', defaultDestinationIds[movementType], {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [
    defaultDestinationIds,
    destinationOptions,
    movementType,
    setValue,
    watchedLocalCongregationId,
  ])

  useEffect(() => {
    if (watchedThemeId.length === 0) {
      return
    }

    const selectedThemeStillAllowed = speakerThemeOptions.some(
      (theme) => theme.id === watchedThemeId,
    )

    if (!selectedThemeStillAllowed) {
      setValue('themeId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [setValue, speakerThemeOptions, watchedThemeId])

  function handleMovementTypeChange(nextMovementType: MovementType) {
    setMovementTypeOverride(nextMovementType)

    if (!editingAssignment) {
      setValue('status', nextMovementType === 'local' ? 'confirmed' : 'pending', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    setValue('localCongregationId', getDefaultDestinationId(nextMovementType), {
      shouldDirty: true,
      shouldValidate: true,
    })
    setValue('speakerId', '', {
      shouldDirty: true,
      shouldValidate: true,
    })
    setValue('themeId', '', {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleStartCreate() {
    const nextMovementType = preferredMovementType

    setEditingId(null)
    setFeedback(null)
    setMovementTypeOverride(null)
    reset(
      buildCreateFormValues(
        nextMovementType,
        getDefaultDestinationId(nextMovementType),
      ),
    )
  }

  function handleStartEdit(id: string) {
    const assignment = assignments.find((item) => item.id === id)

    if (!assignment) {
      return
    }

    setEditingId(id)
    setFeedback(null)
    setMovementTypeOverride(
      inferAssignmentMovementType(assignment, congregationsById),
    )
    reset(toAssignmentFormValues(assignment))
  }

  function handleStartReplacement(assignment: FirestoreRecord<AssignmentDocument>) {
    const nextMovementType = inferAssignmentMovementType(
      assignment,
      congregationsById,
    )

    setEditingId(null)
    setFeedback(null)
    setMovementTypeOverride(nextMovementType)
    reset({
      ...buildCreateFormValues(nextMovementType, assignment.localCongregationId),
      calendarEventId: assignment.calendarEventId,
      localCongregationId: assignment.localCongregationId,
      status: 'pending',
    })
  }

  const submitHandler = handleSubmit(async (values) => {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      if (!editingAssignment && !creatableStatusValues.includes(values.status)) {
        setFeedback({
          tone: 'error',
          message: 'Novas designações devem iniciar como pendentes ou confirmadas.',
        })
        return
      }

      if (editingAssignment) {
        await updateAssignmentMutation.mutateAsync({
          id: editingAssignment.id,
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: buildAssignmentSaveFeedbackMessage(
            values.status === 'confirmed'
              ? 'Designação atualizada e confirmada com sucesso.'
              : 'Designação atualizada com sucesso.',
            movementType,
          ),
        })
      } else {
        await createAssignmentMutation.mutateAsync({
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: buildAssignmentSaveFeedbackMessage(
            willReplaceCurrentAssignment
              ? 'Nova designação criada e a anterior foi marcada como substituída.'
              : values.status === 'confirmed'
                ? 'Designação criada já como confirmada.'
                : 'Designação criada com sucesso.',
            movementType,
          ),
        })
      }

      setEditingId(null)
      reset(
        buildCreateFormValues(
          movementType,
          getDefaultDestinationId(movementType),
        ),
      )
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  })

  async function handleQuickConfirm(id: string) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      const assignmentToConfirm = assignments.find((assignment) => assignment.id === id)

      await confirmAssignmentMutation.mutateAsync({
        id,
        actorUid: user.uid,
        actorName,
      })

      if (editingId === id) {
        setEditingId(null)
        reset(
          buildCreateFormValues(
            movementType,
            getDefaultDestinationId(movementType),
          ),
        )
      }

      setFeedback({
        tone: 'success',
        message: buildAssignmentSaveFeedbackMessage(
          'Designação confirmada com sucesso.',
          assignmentToConfirm
            ? inferAssignmentMovementType(assignmentToConfirm, congregationsById)
            : 'local',
        ),
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  async function handleQuickCancel(assignment: FirestoreRecord<AssignmentDocument>) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    const confirmed = window.confirm(
      `Cancelar a designação de ${assignment.speakerName} em ${formatTimestampDate(
        assignment.eventDate,
      )}? O histórico será preservado com status cancelado.`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      await updateAssignmentMutation.mutateAsync({
        id: assignment.id,
        ...toAssignmentFormValues(assignment),
        status: 'cancelled',
        actorUid: user.uid,
        actorName,
      })

      if (editingId === assignment.id) {
        setEditingId(null)
        reset(
          buildCreateFormValues(
            movementType,
            getDefaultDestinationId(movementType),
          ),
        )
      }

      setFeedback({
        tone: 'success',
        message: buildAssignmentSaveFeedbackMessage(
          'Designação cancelada com sucesso.',
          inferAssignmentMovementType(assignment, congregationsById),
        ),
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  async function handleRequestManualGoogleCalendarSync(
    assignment: FirestoreRecord<AssignmentDocument>,
  ) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    if (!calendarSettingsQuery.data?.enabled) {
      setFeedback({
        tone: 'error',
        message: 'Ative a integração da agenda nas configurações antes de sincronizar.',
      })
      return
    }

    setFeedback(null)

    try {
      await requestManualGoogleCalendarSyncMutation.mutateAsync({
        actorUid: user.uid,
        actorName,
        calendarEventId: assignment.calendarEventId,
      })

      setFeedback({
        tone: 'success',
        message: 'Solicitação enviada para sincronização com a agenda. Ela será processada no próximo ciclo.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operação"
        title="Designações"
        description="Organize visitantes, saídas locais e confirmações em uma visão mais direta para o uso diário."
        actions={
          <>
            <Badge className="bg-primary/10 text-primary">{activeYear}</Badge>
            <Button onClick={handleStartCreate} disabled={isSubmitting}>
              <Plus className="size-4" />
              Nova designação
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryStat
          label="Designações no ano"
          value={String(stats.total)}
          detail="Total de registros do ano selecionado."
          icon={CalendarDays}
          tone="blue"
        />
        <SummaryStat
          label="Pendentes"
          value={String(stats.pending)}
          detail="Aguardando resposta do orador."
          icon={Clock3}
          tone="amber"
        />
        <SummaryStat
          label="Confirmadas"
          value={String(stats.confirmed)}
          detail="Datas já prontas para operar."
          icon={CheckCircle2}
          tone="green"
        />
        <SummaryStat
          label="Saídas locais"
          value={String(stats.outgoing)}
          detail="Oradores locais atendendo fora."
          icon={ArrowRightLeft}
          tone="slate"
        />
        <SummaryStat
          label="Datas sem cobertura"
          value={String(stats.openSlots)}
          detail="Eventos ainda sem designação ativa."
          icon={ShieldAlert}
          tone="amber"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">
                  {editingAssignment ? 'Editar designação' : 'Nova designação'}
                </CardTitle>
                <CardDescription>
                  {editingAssignment
                    ? 'Atualize status, observações, destino e tema sem perder o histórico da data.'
                    : 'Cadastre uma nova designação e depois envie para a agenda externa somente quando fizer sentido.'}
                </CardDescription>
              </div>
              {editingAssignment ? (
                <Button
                  variant="outline"
                  onClick={handleStartCreate}
                  disabled={isSubmitting}
                >
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={submitHandler}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Tipo de designação</span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {movementOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-[16px] border px-4 py-3.5 text-left text-sm transition ${
                          movementType === option.value
                            ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                            : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                        }`}
                        onClick={() => handleMovementTypeChange(option.value)}
                      >
                        <p className="font-medium text-foreground">{option.title}</p>
                        <p className="mt-1 leading-6">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Data</span>
                  <select className={selectClassName} {...register('calendarEventId')}>
                    <option value="">Selecione um evento</option>
                    {eligibleEvents.map((event) => {
                      const activeAssignment = operationalAssignmentMap.get(event.id)
                      const eventLabel = `${formatTimestampDate(event.date)} - ${
                        calendarEventTypeLabels[event.type]
                      }`

                      return (
                        <option key={event.id} value={event.id}>
                          {activeAssignment
                            ? `${eventLabel} - ocupado por ${activeAssignment.speakerName}`
                            : `${eventLabel} - disponível`}
                        </option>
                      )
                    })}
                  </select>
                  {errors.calendarEventId ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.calendarEventId.message}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Congregação de destino
                    </span>
                    <select className={selectClassName} {...register('localCongregationId')}>
                      <option value="">Selecione a congregação</option>
                      {destinationOptions.map((congregation) => (
                        <option key={congregation.id} value={congregation.id}>
                          {congregation.name}
                        </option>
                      ))}
                    </select>
                    {errors.localCongregationId ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.localCongregationId.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Orador</span>
                    <select className={selectClassName} {...register('speakerId')}>
                      <option value="">Selecione o orador</option>
                      {speakerOptions.map((speaker) => (
                        <option key={speaker.id} value={speaker.id}>
                          {speaker.name} - {speaker.congregationName ?? 'Sem congregação'}
                        </option>
                      ))}
                    </select>
                    {errors.speakerId ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.speakerId.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Tema</span>
                  <select className={selectClassName} {...register('themeId')}>
                    <option value="">
                      {selectedSpeaker
                        ? 'Selecione um tema do orador'
                        : 'Escolha primeiro o orador'}
                    </option>
                    {speakerThemeOptions.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        Tema {theme.number} - {theme.title}
                      </option>
                    ))}
                  </select>
                  {errors.themeId ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.themeId.message}
                    </p>
                  ) : null}
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {editableStatusOptions.map((option) => {
                      const disabled =
                        !editingAssignment && !creatableStatusValues.includes(option.value)

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`rounded-[16px] border px-4 py-3.5 text-left text-sm transition ${
                            watchedStatus === option.value
                              ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                              : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                          } ${disabled ? 'cursor-not-allowed opacity-50 hover:bg-background' : ''}`}
                          onClick={() => {
                            if (disabled) {
                              return
                            }

                            setValue('status', option.value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }}
                          disabled={disabled}
                        >
                          <p className="font-medium text-foreground">{option.title}</p>
                          <p className="mt-1 leading-6">{option.description}</p>
                        </button>
                      )
                    })}
                  </div>
                  {!editingAssignment ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Novas designações começam como pendentes ou confirmadas. Os
                      demais status ficam disponíveis quando a data já estiver criada.
                    </p>
                  ) : null}
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Observações</span>
                  <Textarea
                    placeholder="Anote retorno, transporte, troca ou qualquer detalhe útil para a organização."
                    {...register('notes')}
                  />
                  {errors.notes ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.notes.message}
                    </p>
                  ) : null}
                </label>
              </div>

              {!canSubmit ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {eligibleEvents.length === 0
                    ? 'Cadastre ao menos uma data disponível na agenda antes de salvar uma designação.'
                    : !hasDestinations
                      ? movementType === 'outgoing'
                        ? 'Cadastre ao menos uma congregação parceira ativa para registrar saídas locais.'
                        : 'Cadastre ao menos uma congregação local ativa para registrar entradas ou designações locais.'
                      : !hasSpeakerOptions
                        ? movementType === 'incoming'
                          ? 'Cadastre ao menos um orador visitante ativo para registrar esse tipo de designação.'
                          : 'Cadastre ao menos um orador local ativo para registrar esta operação.'
                        : 'Selecione um orador com temas ativos para concluir a designação.'}
                </div>
              ) : null}

              {selectedEvent ? (
                <div className="rounded-[16px] border border-border/70 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {calendarEventTypeLabels[selectedEvent.type]} em{' '}
                    {formatTimestampDate(selectedEvent.date)}
                  </p>
                  <p className="mt-2">
                    {selectedDestinationCongregation
                      ? `Congregação de destino: ${selectedDestinationCongregation.name}.`
                      : 'Selecione a congregação de destino para completar a designação.'}
                  </p>
                </div>
              ) : null}

              {selectedSpeakerMissingEmail ? (
                <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  <p className="font-medium">
                    Este orador ainda não possui e-mail cadastrado.
                  </p>
                  <p className="mt-2">
                    A designação pode ser salva, mas os lembretes por e-mail e o convite na agenda não poderão ser enviados até que o cadastro seja atualizado.
                  </p>
                </div>
              ) : null}

              {selectedEventCoveredByOtherAssignment ? (
                <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  <p className="font-medium">Esta data já possui cobertura operacional.</p>
                  <p className="mt-2">
                    {currentOperationalAssignment?.speakerName} esta ocupando o slot
                    agora com status{' '}
                    {currentOperationalAssignment
                      ? assignmentStatusLabels[currentOperationalAssignment.status]
                      : 'operacional'}
                    .
                  </p>
                  {!editingAssignment && isAssignmentCoveringCalendarSlot(watchedStatus) ? (
                    <p className="mt-2">
                      Se você salvar uma nova designação pendente ou confirmada,
                      a anterior será marcada como substituída automaticamente.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {recentThemeUsage ? (
                <div className="rounded-[16px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                  <p className="font-medium">Atenção ao tema recente</p>
                  <p className="mt-2">
                    Tema {recentThemeUsage.themeNumber} foi usado em{' '}
                    {formatTimestampDate(recentThemeUsage.eventDate)} por{' '}
                    {recentThemeUsage.speakerName} para{' '}
                    {recentThemeUsage.localCongregationName}.
                  </p>
                </div>
              ) : null}

              {feedback ? (
                <div className={getFeedbackContainerClassName(feedback.tone)}>
                  {feedback.message}
                </div>
              ) : null}

              {totalQueryErrors.length > 0 ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {getErrorMessage(totalQueryErrors[0])}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {editingAssignment
                    ? `Última atualização em ${formatUpdatedAt(
                        editingAssignment.updatedAt.toDate(),
                      )}.`
                    : 'As validações de tema, disponibilidade e bloqueio de datas continuam ativas ao salvar.'}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isDirty}
                    onClick={() =>
                      reset(
                        editingAssignment
                          ? toAssignmentFormValues(editingAssignment)
                          : buildCreateFormValues(
                              movementType,
                              getDefaultDestinationId(movementType),
                            ),
                      )
                    }
                  >
                    <Undo2 className="size-4" />
                    Restaurar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !canSubmit}>
                    <Plus className="size-4" />
                    {editingAssignment ? 'Salvar alterações' : 'Salvar designação'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-2xl">Designações do ano</CardTitle>
                <CardDescription>
                  Localize, confirme, substitua ou cancele uma designação sem sair da mesma tela.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                <span>Resultados</span>
                <span className="font-medium text-foreground">
                  {filteredAssignments.length}/{assignments.length}
                </span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.15fr_220px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-11"
                  placeholder="Buscar por orador, tema ou congregação..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <select
                className={selectClassName}
                value={movementFilter}
                onChange={(event) =>
                  setMovementFilter(event.target.value as 'all' | MovementType)
                }
              >
                <option value="all">Todos os movimentos</option>
                <option value="incoming">Oradores visitantes</option>
                <option value="outgoing">Discursos fora</option>
                <option value="local">Designações locais</option>
              </select>
              <select
                className={selectClassName}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | AssignmentStatus)
                }
              >
                <option value="all">Todos os status</option>
                {editableStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {assignmentsQuery.isLoading || calendarEventsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="h-56 animate-pulse rounded-[18px] border border-border/70 bg-background"
                  />
                ))}
              </div>
            ) : null}

            {!assignmentsQuery.isLoading &&
            !assignmentsQuery.isError &&
            filteredAssignments.length === 0 ? (
              <EmptyState
                title={
                  assignments.length > 0
                    ? 'Nenhuma designação encontrada'
                    : 'Ainda não há designações neste ano'
                }
                description={
                  assignments.length > 0
                    ? 'Ajuste os filtros para encontrar a designação desejada.'
                    : 'Crie a primeira designação para começar a organizar a agenda.'
                }
              />
            ) : null}

            {!assignmentsQuery.isLoading &&
            !assignmentsQuery.isError &&
            filteredAssignments.length > 0 ? (
              <div className="space-y-3">
                {filteredAssignments.map((assignment) => {
                  const movementTypeForAssignment = inferAssignmentMovementType(
                    assignment,
                    congregationsById,
                  )
                  const movementLabel = getAssignmentMovementLabel(
                    movementTypeForAssignment,
                  )
                  const theme = themesById.get(assignment.themeId)
                  const hasQuickConfirm = assignment.status === 'pending'
                  const canQuickCancel =
                    assignment.status === 'pending' || assignment.status === 'confirmed'
                  const linkedCalendarEvent =
                    calendarEventsById.get(assignment.calendarEventId) ?? null
                  const isLatestAssignmentForEvent =
                    googleCalendarActionOwnerByCalendarEventId.get(assignment.calendarEventId)?.id ===
                    assignment.id
                  const googleCalendarSyncState = getAssignmentGoogleCalendarSyncState({
                    assignment,
                    calendarEvent: linkedCalendarEvent,
                    calendarSettingsEnabled: calendarSettingsQuery.data?.enabled ?? false,
                    calendarSettingsUpdatedAt:
                      calendarSettingsQuery.data?.configurationUpdatedAt?.toDate() ?? null,
                    isLatestAssignmentForEvent,
                    movementType: movementTypeForAssignment,
                  })

                  return (
                    <div
                      key={assignment.id}
                      className="rounded-[18px] border border-border/70 bg-background p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{movementLabel}</Badge>
                            <Badge className={getStatusClassName(assignment.status)}>
                              {assignmentStatusLabels[assignment.status]}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatTimestampDate(assignment.eventDate)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-xl font-semibold text-foreground">
                            {assignment.speakerName}
                          </h3>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[16px] border border-border/70 bg-background px-4 py-3.5">
                              <div className="flex items-start gap-3">
                                <CalendarDays className="mt-0.5 size-4 text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Evento
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {calendarEventTypeLabels[assignment.eventType]}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {assignment.localCongregationName}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-[16px] border border-border/70 bg-background px-4 py-3.5">
                              <div className="flex items-start gap-3">
                                <MapPinned className="mt-0.5 size-4 text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Origem
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {assignment.originCongregationName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {assignment.speakerType === 'visitor'
                                      ? 'Visitante'
                                      : 'Local'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                            <div className="flex items-start gap-3">
                              <Mic2 className="mt-0.5 size-4 text-primary" />
                              <div>
                                <p className="text-foreground">
                                  Tema {assignment.themeNumber}
                                </p>
                                <p>{assignment.themeTitle}</p>
                                {theme && !theme.isActive ? (
                                  <p className="text-xs text-amber-700 dark:text-amber-200">
                                    Tema atualmente inativo, preservado aqui por histórico.
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            {assignment.notes ? (
                              <div className="flex items-start gap-3">
                                <Speech className="mt-0.5 size-4 text-primary" />
                                <p className="leading-6">{assignment.notes}</p>
                              </div>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <span>Atualizado em {formatUpdatedAt(assignment.updatedAt.toDate())}</span>
                              {assignment.confirmedAt ? (
                                <span>
                                  Confirmado em{' '}
                                  {formatUpdatedAt(assignment.confirmedAt.toDate())}
                                </span>
                              ) : null}
                            </div>

                            {googleCalendarSyncState ? (
                              <div
                                className={`rounded-[16px] border px-4 py-3.5 ${getGoogleCalendarSyncBadgeClassName(
                                  googleCalendarSyncState.tone,
                                )}`}
                              >
                                <div className="flex items-start gap-3">
                                  <GoogleCalendarButtonMark />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {googleCalendarSyncState.label}
                                    </p>
                                    <p className="mt-1 text-sm leading-6">
                                      {googleCalendarSyncState.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                          {googleCalendarSyncState?.canShowAction ? (
                            <Button
                              variant="outline"
                              onClick={() => handleRequestManualGoogleCalendarSync(assignment)}
                              disabled={isSubmitting || !googleCalendarSyncState.canRequestSync}
                            >
                              <GoogleCalendarButtonMark />
                              Enviar para agenda
                            </Button>
                          ) : null}
                          {hasQuickConfirm ? (
                            <Button
                              onClick={() => handleQuickConfirm(assignment.id)}
                              disabled={isSubmitting}
                            >
                              <CheckCircle2 className="size-4" />
                              Confirmar
                            </Button>
                          ) : null}
                          {canQuickCancel ? (
                            <Button
                              variant="outline"
                              onClick={() => handleQuickCancel(assignment)}
                              disabled={isSubmitting}
                            >
                              <XCircle className="size-4" />
                              Cancelar
                            </Button>
                          ) : null}
                          {isAssignmentCoveringCalendarSlot(assignment.status) ? (
                            <Button
                              variant="outline"
                              onClick={() => handleStartReplacement(assignment)}
                              disabled={isSubmitting}
                            >
                              <ArrowRightLeft className="size-4" />
                              Substituir
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            onClick={() => handleStartEdit(assignment.id)}
                            disabled={isSubmitting}
                          >
                            <PencilLine className="size-4" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
