import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRightLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LogIn,
  LogOut,
  MailCheck,
  MailWarning,
  MapPin,
  MapPinned,
  MessageCircle,
  Mic2,
  PencilLine,
  Plus,
  Search,
  Speech,
  Undo2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { EmptyState } from '@/components/app/empty-state'
import { MetadataChip } from '@/components/app/metadata-chip'
import { PageHeader } from '@/components/app/page-header'
import { PageHeaderStat } from '@/components/app/page-header-stat'
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
import { useToast } from '@/components/ui/use-toast'
import {
  emailDeliveryUnavailableMessage,
  isEmailDeliveryConfigured,
} from '@/config/email'
import { useAppSettingsQuery, useCalendarSettingsQuery } from '@/hooks/use-app-settings'
import {
  useAssignmentsByYearQuery,
  useConfirmAssignmentMutation,
  useCreateAssignmentMutation,
  useRecentAssignmentsQuery,
  useRequestManualAssignmentConfirmationEmailMutation,
  useUpdateAssignmentMutation,
} from '@/hooks/use-assignments'
import {
  useCalendarEventsQuery,
  useRequestManualGoogleCalendarSyncMutation,
} from '@/hooks/use-calendar-events'
import { useCongregationsManagementQuery } from '@/hooks/use-congregations'
import { useNotificationsByIdsQuery } from '@/hooks/use-notifications'
import { useSpeakersManagementQuery } from '@/hooks/use-speakers'
import { useThemesManagementQuery } from '@/hooks/use-themes'
import {
  getThemeCategoryLabel,
  themeCategoryOptions,
  type ThemeCategory,
} from '@/lib/theme-categories'
import { cn } from '@/lib/utils'
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
import { buildAssignmentWhatsAppConfirmationUrl } from '@/utils/assignment-whatsapp'
import { isTimestampInCurrentAssignmentRevision } from '@/utils/notification-sync'
import {
  assignmentStatusLabels,
  buildOperationalAssignmentMapByCalendarEventId,
  calendarEventTypeLabels,
  formatTimestampDate,
  isAssignmentCoveringCalendarSlot,
} from '@/utils/calendar-events'

const currentYear = new Date().getFullYear()

type ThemeCategoryFilter = 'all' | ThemeCategory

const selectClassName =
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70'
const emailDeliveryConfigured = isEmailDeliveryConfigured()

const assignmentFormSchema = z.object({
  calendarEventId: z.string().trim().min(1, 'Selecione o sábado da designação.'),
  localCongregationId: z
    .string()
    .trim()
    .min(1, 'Selecione a congregação que receberá o discurso.'),
  speakerId: z.string().trim().min(1, 'Selecione o orador.'),
  themeId: z.string().trim().min(1, 'Selecione o tema.'),
  status: z.enum(['pending', 'confirmed', 'declined', 'cancelled', 'replaced']),
  notes: z.string().trim(),
  emailNotificationsEnabled: z.boolean(),
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
  icon: LucideIcon
}> = [
  {
    value: 'incoming',
    title: 'Orador visitante',
    description: 'Visitante discursa aqui.',
    icon: LogIn,
  },
  {
    value: 'local',
    title: 'Designação local',
    description: 'Local discursa aqui.',
    icon: MapPin,
  },
  {
    value: 'outgoing',
    title: 'Discurso fora',
    description: 'Local discursa fora.',
    icon: LogOut,
  },
]

const editableStatusOptions: Array<{
  value: AssignmentStatus
  title: string
  shortDescription: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'pending',
    title: 'Pendente',
    shortDescription: 'Aguardando resposta.',
    description: 'A designação foi montada, mas ainda aguarda resposta.',
    icon: Clock3,
  },
  {
    value: 'confirmed',
    title: 'Confirmado',
    shortDescription: 'Pronto para operar.',
    description: 'Retorno recebido e sábado pronto para operar com seguranca.',
    icon: CheckCircle2,
  },
  {
    value: 'declined',
    title: 'Recusado',
    shortDescription: 'Orador não aceitou.',
    description: 'O orador não aceitou e a data precisa ser reorganizada.',
    icon: Ban,
  },
  {
    value: 'cancelled',
    title: 'Cancelado',
    shortDescription: 'Sai da operação.',
    description: 'O registro permanece no histórico, mas sai da operação atual.',
    icon: XCircle,
  },
  {
    value: 'replaced',
    title: 'Substituído',
    shortDescription: 'Preserva a troca.',
    description: 'Fica preservado apenas como trilha da troca realizada.',
    icon: ArrowRightLeft,
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
    return 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getYearFromImplicitCalendarEventId(id: string) {
  const match = /^active-(\d{4})-\d{2}-\d{2}$/.exec(id)

  if (!match) {
    return null
  }

  const year = Number.parseInt(match[1] ?? '', 10)

  return Number.isInteger(year) ? year : null
}

function parseCalendarEventYearParam(value: string | null) {
  if (!value) {
    return null
  }

  const year = Number.parseInt(value, 10)

  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null
}

function normalizeMeetingDayLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getMeetingDayIndex(meetingDay: string) {
  const normalizedLabel = normalizeMeetingDayLabel(meetingDay)

  switch (normalizedLabel) {
    case 'domingo':
      return 0
    case 'segunda-feira':
      return 1
    case 'terca-feira':
      return 2
    case 'quarta-feira':
      return 3
    case 'quinta-feira':
      return 4
    case 'sexta-feira':
      return 5
    case 'sabado':
      return 6
    default:
      return null
  }
}

function matchesMeetingDay(
  event: FirestoreRecord<CalendarEventDocument>,
  meetingDayIndex: number | null,
) {
  if (meetingDayIndex === null) {
    return true
  }

  return event.date.toDate().getDay() === meetingDayIndex
}

function getMeetingDayHelperLabel(meetingDay: string) {
  if (meetingDay.trim().length === 0) {
    return 'datas carregadas'
  }

  return `datas de ${meetingDay.toLowerCase()}`
}

function getMovementOptionToneClassName(
  movementType: MovementType,
  isSelected: boolean,
) {
  if (movementType === 'incoming') {
    return isSelected
      ? 'border-sky-500 bg-sky-50 text-sky-950 shadow-sm dark:border-sky-400 dark:bg-sky-500/10 dark:text-sky-100'
      : 'border-sky-200 bg-sky-50/50 text-slate-700 hover:bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-slate-200'
  }

  if (movementType === 'local') {
    return isSelected
      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-100'
      : 'border-emerald-200 bg-emerald-50/50 text-slate-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-slate-200'
  }

  return isSelected
    ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-400 dark:bg-amber-500/10 dark:text-amber-100'
    : 'border-amber-200 bg-amber-50/50 text-slate-700 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-slate-200'
}

function getMovementOptionIconClassName(movementType: MovementType) {
  if (movementType === 'incoming') {
    return 'text-sky-600 dark:text-sky-300'
  }

  if (movementType === 'local') {
    return 'text-emerald-600 dark:text-emerald-300'
  }

  return 'text-amber-600 dark:text-amber-300'
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

  if (options.hasLocalCongregations && options.hasLocalSpeakers) {
    return 'local'
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
  return (
    movementType === 'incoming' ||
    movementType === 'local' ||
    movementType === 'outgoing'
  )
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

  return `${baseMessage} Use "Sincronizar Agenda" quando quiser refletir isso no Google Calendar.`
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
          description: 'O sábado vinculado não foi encontrado para esta designação.',
          label: 'Sábado indisponível',
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
      description: 'Ative a integração nas configurações antes de publicar ou remover este item no Google Calendar.',
      label: 'Integração desligada',
      tone: 'warning',
    }
  }

  if (hasFreshManualRequest && syncStatus === 'pending') {
    return {
      canRequestSync: false,
      canShowAction: true,
      description: 'A sincronização deste item está em andamento.',
      label: 'Sincronizando agenda',
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
      description: 'O Google Calendar ainda precisa remover a publicação anterior deste evento.',
      label: 'Remoção pendente',
      tone: 'warning',
    }
  }

  if (needsManualPublish) {
    return {
      canRequestSync: true,
      canShowAction: true,
      description: hasRemoteEvent
        ? 'O Google Calendar ainda não recebeu esta atualização mais recente.'
        : 'Esta designação já pode ser enviada para o Google Calendar.',
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
      description: 'O Google Calendar já está alinhado com a versão atual deste item.',
      label: 'Agenda atualizada',
      tone: 'success',
    }
  }

  return null
}

export function AssignmentsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [referenceNow] = useState(() => Date.now())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all')
  const [movementFilter, setMovementFilter] = useState<'all' | MovementType>('all')
  const [themeCategoryFilter, setThemeCategoryFilter] =
    useState<ThemeCategoryFilter>('all')
  const [themeSearchTerm, setThemeSearchTerm] = useState('')
  const [visitorCongregationFilterId, setVisitorCongregationFilterId] = useState('')
  const [meetingDateDraft, setMeetingDateDraft] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [dateFieldFeedback, setDateFieldFeedback] = useState<string | null>(null)
  const [movementTypeOverride, setMovementTypeOverride] = useState<MovementType | null>(
    null,
  )
  const todayDateKey = useMemo(() => getLocalDateKey(new Date(referenceNow)), [referenceNow])

  const appSettingsQuery = useAppSettingsQuery()
  const calendarSettingsQuery = useCalendarSettingsQuery()
  const activeYear = appSettingsQuery.data?.defaultYear ?? currentYear
  const requestedCalendarEventId = searchParams.get('evento')?.trim() ?? ''
  const requestedCalendarEventYearParam = parseCalendarEventYearParam(
    searchParams.get('ano'),
  )
  const requestedCalendarEventYear =
    requestedCalendarEventId.length > 0
      ? requestedCalendarEventYearParam ??
        getYearFromImplicitCalendarEventId(requestedCalendarEventId)
      : null
  const shouldLoadRequestedCalendarEventYear =
    requestedCalendarEventYear !== null && requestedCalendarEventYear !== activeYear
  const assignmentsQuery = useAssignmentsByYearQuery(activeYear)
  const requestedYearAssignmentsQuery = useAssignmentsByYearQuery(
    requestedCalendarEventYear ?? activeYear,
    shouldLoadRequestedCalendarEventYear,
  )
  const recentAssignmentsQuery = useRecentAssignmentsQuery(24)
  const calendarEventsQuery = useCalendarEventsQuery(activeYear)
  const requestedYearCalendarEventsQuery = useCalendarEventsQuery(
    requestedCalendarEventYear ?? activeYear,
    shouldLoadRequestedCalendarEventYear,
  )
  const congregationsQuery = useCongregationsManagementQuery()
  const speakersQuery = useSpeakersManagementQuery()
  const themesQuery = useThemesManagementQuery()
  const createAssignmentMutation = useCreateAssignmentMutation()
  const updateAssignmentMutation = useUpdateAssignmentMutation()
  const confirmAssignmentMutation = useConfirmAssignmentMutation()
  const requestManualEmailMutation =
    useRequestManualAssignmentConfirmationEmailMutation()
  const requestManualGoogleCalendarSyncMutation = useRequestManualGoogleCalendarSyncMutation()

  const assignments = useMemo(
    () =>
      [
        ...(assignmentsQuery.data ?? []),
        ...(shouldLoadRequestedCalendarEventYear
          ? requestedYearAssignmentsQuery.data ?? []
          : []),
      ].sort((left, right) => {
        const eventDateDifference = right.eventDate.toMillis() - left.eventDate.toMillis()

        if (eventDateDifference !== 0) {
          return eventDateDifference
        }

        return right.updatedAt.toMillis() - left.updatedAt.toMillis()
      }),
    [
      assignmentsQuery.data,
      requestedYearAssignmentsQuery.data,
      shouldLoadRequestedCalendarEventYear,
    ],
  )
  const assignmentNotificationIds = useMemo(
    () =>
      assignments.map((assignment) => `${assignment.id}__manual`),
    [assignments],
  )
  const assignmentNotificationsQuery = useNotificationsByIdsQuery(
    assignmentNotificationIds,
    assignmentNotificationIds.length > 0,
  )
  const notificationsById = useMemo(
    () =>
      new Map(
        (assignmentNotificationsQuery.data ?? []).map((notification) => [
          notification.id,
          notification,
        ]),
      ),
    [assignmentNotificationsQuery.data],
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
      [
        ...(calendarEventsQuery.data ?? []),
        ...(shouldLoadRequestedCalendarEventYear
          ? requestedYearCalendarEventsQuery.data ?? []
          : []),
      ].filter((event) => !event.blocksAssignments && event.isActive),
    [
      calendarEventsQuery.data,
      requestedYearCalendarEventsQuery.data,
      shouldLoadRequestedCalendarEventYear,
    ],
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
  const localMeetingDay = localCongregations[0]?.meetingDay ?? ''
  const localMeetingDayIndex = useMemo(
    () => getMeetingDayIndex(localMeetingDay),
    [localMeetingDay],
  )
  const meetingDayEligibleEvents = useMemo(
    () =>
      eligibleEvents.filter((event) => matchesMeetingDay(event, localMeetingDayIndex)),
    [eligibleEvents, localMeetingDayIndex],
  )
  const selectableEvents = useMemo(
    () =>
      meetingDayEligibleEvents.length > 0 ? meetingDayEligibleEvents : eligibleEvents,
    [eligibleEvents, meetingDayEligibleEvents],
  )
  const quickSelectableEvents = useMemo(() => {
    const futureEvents = selectableEvents.filter(
      (event) => getLocalDateKey(event.date.toDate()) >= todayDateKey,
    )

    return (futureEvents.length > 0 ? futureEvents : selectableEvents).slice(0, 6)
  }, [selectableEvents, todayDateKey])
  const selectableEventsByDateInputValue = useMemo(
    () =>
      new Map(
        selectableEvents.map((event) => [getLocalDateKey(event.date.toDate()), event] as const),
      ),
    [selectableEvents],
  )
  const isMeetingDayFilterActive =
    localMeetingDayIndex !== null && meetingDayEligibleEvents.length > 0
  const isMeetingDayFilterUnavailable =
    localMeetingDay.trim().length > 0 &&
    localMeetingDayIndex !== null &&
    eligibleEvents.length > 0 &&
    meetingDayEligibleEvents.length === 0

  const nextOpenEvent = useMemo(() => {
    const futureOpenEvent = selectableEvents.find(
      (event) =>
        event.date.toMillis() >= referenceNow &&
        !operationalAssignmentMap.has(event.id),
    )

    if (futureOpenEvent) {
      return futureOpenEvent
    }

    return (
      selectableEvents.find((event) => !operationalAssignmentMap.has(event.id)) ??
      selectableEvents[0] ??
      null
    )
  }, [operationalAssignmentMap, referenceNow, selectableEvents])

  const editingAssignment =
    assignments.find((assignment) => assignment.id === editingId) ?? null
  const actorName = user?.displayName ?? user?.email ?? null
  const baseLocalCongregation = localCongregations[0] ?? null
  const localCongregationIds = useMemo(
    () => new Set(localCongregations.map((congregation) => congregation.id)),
    [localCongregations],
  )

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
  const watchedEmailNotificationsEnabled =
    useWatch({
      control,
      name: 'emailNotificationsEnabled',
    }) ?? false
  const speakerFieldRegistration = register('speakerId', {
    onChange: () => setThemeSearchTerm(''),
  })

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
  const visitorCongregationFilterOptions = useMemo(
    () =>
      partnerCongregations.filter(
        (congregation) =>
          congregation.isActive || congregation.id === visitorCongregationFilterId,
      ),
    [partnerCongregations, visitorCongregationFilterId],
  )
  const speakerOptions = useMemo(
    () => {
      if (movementType === 'incoming' && visitorCongregationFilterId.length === 0) {
        return []
      }

      return (speakersQuery.data ?? []).filter((speaker) => {
        const matchesType = speaker.type === getSpeakerTypeForMovement(movementType)
        const isAllowedByStatus = speaker.isActive || speaker.id === watchedSpeakerId

        if (!matchesType || !isAllowedByStatus) {
          return false
        }

        if (movementType === 'incoming') {
          return (
            speaker.congregationId === visitorCongregationFilterId ||
            speaker.id === watchedSpeakerId
          )
        }

        return (
          localCongregationIds.has(speaker.congregationId) || speaker.id === watchedSpeakerId
        )
      })
    },
    [
      localCongregationIds,
      movementType,
      speakersQuery.data,
      visitorCongregationFilterId,
      watchedSpeakerId,
    ],
  )

  const selectedEvent =
    eligibleEvents.find((event) => event.id === watchedCalendarEventId) ?? null
  const meetingDateValue =
    meetingDateDraft ?? (selectedEvent ? getLocalDateKey(selectedEvent.date.toDate()) : '')
  const requestedCalendarEvent =
    requestedCalendarEventId.length > 0
      ? eligibleEvents.find((event) => event.id === requestedCalendarEventId) ?? null
      : null
  const selectedSpeaker = speakersById.get(watchedSpeakerId) ?? null
  const selectedSpeakerMissingEmail = Boolean(
    selectedSpeaker && selectedSpeaker.email.trim().length === 0,
  )
  const selectedDestinationCongregation =
    congregationsById.get(watchedLocalCongregationId) ?? null
  const selectedVisitorCongregation =
    congregationsById.get(visitorCongregationFilterId) ?? null
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
  const selectedTheme = themesById.get(watchedThemeId) ?? null
  const filteredSpeakerThemeOptions = useMemo(
    () =>
      speakerThemeOptions.filter(
        (theme) => {
          const matchesCategory =
            themeCategoryFilter === 'all' ||
            theme.category === themeCategoryFilter ||
            theme.id === watchedThemeId
          const normalizedThemeSearch = themeSearchTerm.trim().toLowerCase()
          const searchableContent = [
            String(theme.number),
            theme.title,
            getThemeCategoryLabel(theme.category),
          ]
            .join(' ')
            .toLowerCase()
          const matchesSearch =
            normalizedThemeSearch.length === 0 ||
            searchableContent.includes(normalizedThemeSearch) ||
            theme.id === watchedThemeId

          return matchesCategory && matchesSearch
        },
      ),
    [speakerThemeOptions, themeCategoryFilter, themeSearchTerm, watchedThemeId],
  )

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
  const selectedEventTime = selectedEvent?.date.toMillis() ?? Number.POSITIVE_INFINITY

  const recentThemeUsage = watchedThemeId
    ? recentAssignments.find(
        (assignment) =>
          assignment.id !== editingId &&
          assignment.themeId === watchedThemeId &&
          assignment.eventDate.toMillis() <= selectedEventTime,
      ) ?? null
    : null

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
  const pendingAssignmentsCount = assignments.filter(
    (assignment) => assignment.status === 'pending',
  ).length
  const confirmedAssignmentsCount = assignments.filter(
    (assignment) => assignment.status === 'confirmed',
  ).length
  const closedAssignmentsCount = assignments.filter(
    (assignment) =>
      assignment.status === 'declined' ||
      assignment.status === 'cancelled' ||
      assignment.status === 'replaced',
  ).length

  const hasDestinations = destinationOptions.length > 0
  const hasSpeakerOptions = speakerOptions.length > 0
  const hasThemeOptions = speakerThemeOptions.length > 0
  const needsVisitorCongregationFilter =
    movementType === 'incoming' && visitorCongregationFilterId.length === 0
  const canSubmit =
    selectableEvents.length > 0 &&
    hasDestinations &&
    hasSpeakerOptions &&
    (!selectedSpeaker || hasThemeOptions)
  const selectedMovementOption =
    movementOptions.find((option) => option.value === movementType) ?? null
  const selectedStatusOption =
    editableStatusOptions.find((option) => option.value === watchedStatus) ?? null
  const destinationSummaryLabel =
    selectedDestinationCongregation?.name ??
    (movementType === 'outgoing'
      ? 'Escolha destino'
      : baseLocalCongregation?.name ?? 'Sem congregação base')
  const speakerSummaryLabel =
    selectedSpeaker?.name ??
    (needsVisitorCongregationFilter ? 'Escolha congregação' : 'Escolha orador')
  const themeSummaryLabel = selectedTheme
    ? `Tema ${selectedTheme.number}`
    : selectedSpeaker
      ? 'Escolha tema'
      : 'Tema bloqueado'
  const statusOptionsForForm = editingAssignment
    ? editableStatusOptions
    : editableStatusOptions.filter((option) =>
        creatableStatusValues.includes(option.value),
      )
  const isSubmitting =
    createAssignmentMutation.isPending ||
    updateAssignmentMutation.isPending ||
    confirmAssignmentMutation.isPending ||
    requestManualEmailMutation.isPending ||
    requestManualGoogleCalendarSyncMutation.isPending

  const totalQueryErrors = [
    assignmentsQuery.error,
    requestedYearAssignmentsQuery.error,
    recentAssignmentsQuery.error,
    calendarEventsQuery.error,
    requestedYearCalendarEventsQuery.error,
    assignmentNotificationsQuery.error,
    calendarSettingsQuery.error,
    congregationsQuery.error,
    speakersQuery.error,
    themesQuery.error,
  ].filter(Boolean)

  useEffect(() => {
    if (
      editingAssignment ||
      requestedCalendarEventId.length > 0 ||
      !nextOpenEvent ||
      watchedCalendarEventId.length > 0
    ) {
      return
    }

    setValue('calendarEventId', nextOpenEvent.id)
  }, [
    editingAssignment,
    nextOpenEvent,
    requestedCalendarEventId,
    setValue,
    watchedCalendarEventId,
  ])

  useEffect(() => {
    if (
      editingAssignment ||
      !requestedCalendarEvent ||
      watchedCalendarEventId === requestedCalendarEvent.id
    ) {
      return
    }

    reset({
      ...buildCreateFormValues(
        preferredMovementType,
        defaultDestinationIds[preferredMovementType],
      ),
      calendarEventId: requestedCalendarEvent.id,
    })
  }, [
    defaultDestinationIds,
    editingAssignment,
    preferredMovementType,
    requestedCalendarEvent,
    reset,
    watchedCalendarEventId,
  ])

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

  useEffect(() => {
    if (
      !watchedEmailNotificationsEnabled ||
      (isAssignmentCoveringCalendarSlot(watchedStatus) &&
        !selectedSpeakerMissingEmail &&
        emailDeliveryConfigured)
    ) {
      return
    }

    setValue('emailNotificationsEnabled', false, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [
    selectedSpeakerMissingEmail,
    setValue,
    watchedEmailNotificationsEnabled,
    watchedStatus,
  ])

  function handleMovementTypeChange(nextMovementType: MovementType) {
    setMovementTypeOverride(nextMovementType)
    setThemeCategoryFilter('all')
    setThemeSearchTerm('')
    setVisitorCongregationFilterId('')
    setDateFieldFeedback(null)

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

    setSearchParams({}, { replace: true })
    setEditingId(null)
    setFeedback(null)
    setMovementTypeOverride(null)
    setThemeCategoryFilter('all')
    setThemeSearchTerm('')
    setVisitorCongregationFilterId('')
    setMeetingDateDraft(null)
    setDateFieldFeedback(null)
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

    setSearchParams({}, { replace: true })
    setEditingId(id)
    setFeedback(null)
    setThemeCategoryFilter('all')
    setThemeSearchTerm('')
    const nextMovementType = inferAssignmentMovementType(assignment, congregationsById)
    setVisitorCongregationFilterId(
      nextMovementType === 'incoming' ? assignment.originCongregationId : '',
    )
    setMeetingDateDraft(null)
    setDateFieldFeedback(null)
    setMovementTypeOverride(nextMovementType)
    reset(toAssignmentFormValues(assignment))
  }

  function handleStartReplacement(assignment: FirestoreRecord<AssignmentDocument>) {
    const nextMovementType = inferAssignmentMovementType(
      assignment,
      congregationsById,
    )

    setSearchParams({}, { replace: true })
    setEditingId(null)
    setFeedback(null)
    setMovementTypeOverride(nextMovementType)
    setThemeCategoryFilter('all')
    setThemeSearchTerm('')
    setVisitorCongregationFilterId(
      nextMovementType === 'incoming' ? assignment.originCongregationId : '',
    )
    setMeetingDateDraft(null)
    setDateFieldFeedback(null)
    reset({
      ...buildCreateFormValues(nextMovementType, assignment.localCongregationId),
      calendarEventId: assignment.calendarEventId,
      localCongregationId: assignment.localCongregationId,
      status: 'pending',
    })
  }

  function handleVisitorCongregationFilterChange(nextCongregationId: string) {
    setVisitorCongregationFilterId(nextCongregationId)
    setThemeSearchTerm('')

    if (watchedSpeakerId.length > 0) {
      setValue('speakerId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (watchedThemeId.length > 0) {
      setValue('themeId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  function handleMeetingDateChange(nextDateValue: string) {
    if (nextDateValue.trim().length === 0) {
      setMeetingDateDraft(null)
      setDateFieldFeedback(null)
      setValue('calendarEventId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }

    const matchingEvent = selectableEventsByDateInputValue.get(nextDateValue) ?? null

    if (!matchingEvent) {
      setMeetingDateDraft(nextDateValue)
      setDateFieldFeedback(
        `Escolha uma das ${getMeetingDayHelperLabel(localMeetingDay)} que já estão carregadas no calendário.`,
      )
      setValue('calendarEventId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }

    setMeetingDateDraft(null)
    setDateFieldFeedback(null)
    setValue('calendarEventId', matchingEvent.id, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleThemeSelection(themeId: string) {
    setValue('themeId', themeId, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const submitHandler = handleSubmit(async (values) => {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    setFeedback(null)

    try {
      if (!editingAssignment && !creatableStatusValues.includes(values.status)) {
        const message = 'Novas designações devem iniciar como pendentes ou confirmadas.'
        setFeedback({
          tone: 'error',
          message,
        })
        toast.error(message)
        return
      }

      if (editingAssignment) {
        await updateAssignmentMutation.mutateAsync({
          id: editingAssignment.id,
          ...values,
          actorUid: user.uid,
          actorName,
        })

        const message = buildAssignmentSaveFeedbackMessage(
          values.status === 'confirmed'
            ? 'Designação atualizada e confirmada com sucesso.'
            : 'Designação atualizada com sucesso.',
          movementType,
        )
        setFeedback({
          tone: 'success',
          message,
        })
        toast.success(message)
      } else {
        await createAssignmentMutation.mutateAsync({
          ...values,
          actorUid: user.uid,
          actorName,
        })

        const message = buildAssignmentSaveFeedbackMessage(
          willReplaceCurrentAssignment
            ? 'Nova designação criada e a anterior foi marcada como substituída.'
            : values.status === 'confirmed'
              ? 'Designação criada já como confirmada.'
              : 'Designação criada com sucesso.',
          movementType,
        )
        setFeedback({
          tone: 'success',
          message,
        })
        toast.success(message)
      }

      setSearchParams({}, { replace: true })
      setEditingId(null)
      setDateFieldFeedback(null)
      setThemeSearchTerm('')
      setVisitorCongregationFilterId('')
      setMeetingDateDraft(null)
      reset(
        buildCreateFormValues(
          movementType,
          getDefaultDestinationId(movementType),
        ),
      )
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  })

  async function handleQuickConfirm(id: string) {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
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

      const message = buildAssignmentSaveFeedbackMessage(
        'Designação confirmada com sucesso.',
        assignmentToConfirm
          ? inferAssignmentMovementType(assignmentToConfirm, congregationsById)
          : 'local',
      )
      setFeedback({
        tone: 'success',
        message,
      })
      toast.success(message)
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  }

  async function handleRequestManualConfirmationEmail(
    assignment: FirestoreRecord<AssignmentDocument>,
  ) {
    if (!emailDeliveryConfigured) {
      setFeedback({
        tone: 'error',
        message: emailDeliveryUnavailableMessage,
      })
      toast.error(emailDeliveryUnavailableMessage)
      return
    }

    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    const manualNotification = notificationsById.get(`${assignment.id}__manual`)
    const isRetry = manualNotification?.status === 'failed'
    const confirmed = window.confirm(
      isRetry
        ? `Tentar enviar novamente o e-mail de confirmação para ${assignment.speakerName}?`
        : `Enviar agora o e-mail de confirmação para ${assignment.speakerName}? Depois de enviado, esta ação ficará indisponível para a designação.`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      const result = await requestManualEmailMutation.mutateAsync({
        id: assignment.id,
        actorUid: user.uid,
        actorName,
      })

      const message =
        result === 'sent'
          ? 'E-mail de confirmação enviado com sucesso.'
          : 'O envio falhou temporariamente. Uma nova tentativa foi agendada.'
      setFeedback({
        tone: result === 'sent' ? 'success' : 'error',
        message,
      })
      if (result === 'sent') {
        toast.success(message)
      } else {
        toast.error(message)
      }
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  }

  async function handleQuickCancel(assignment: FirestoreRecord<AssignmentDocument>) {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
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

      const message = buildAssignmentSaveFeedbackMessage(
        'Designação cancelada com sucesso.',
        inferAssignmentMovementType(assignment, congregationsById),
      )
      setFeedback({
        tone: 'success',
        message,
      })
      toast.success(message)
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  }

  async function handleRequestManualGoogleCalendarSync(
    assignment: FirestoreRecord<AssignmentDocument>,
  ) {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    if (!calendarSettingsQuery.data?.enabled) {
      const message = 'Ative a integração com Google Calendar nas configurações antes de sincronizar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    setFeedback(null)

    try {
      const result = await requestManualGoogleCalendarSyncMutation.mutateAsync({
        actorUid: user.uid,
        actorName,
        calendarEventId: assignment.calendarEventId,
      })

      const message =
        result === 'deleted'
          ? 'Evento removido da agenda com sucesso.'
          : 'Agenda sincronizada com sucesso.'
      setFeedback({
        tone: 'success',
        message,
      })
      toast.success(message)
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operação"
        title="Designações"
        description="Defina orador e tema para cada sábado de reunião, com visitantes, locais e confirmações no mesmo fluxo."
        actions={<Badge className="bg-primary/10 text-primary">{activeYear}</Badge>}
        meta={
          <>
            <PageHeaderStat
              label="Cadastradas"
              value={String(assignments.length)}
              icon={Speech}
              tone="blue"
            />
            <PageHeaderStat
              label="Pendentes"
              value={String(pendingAssignmentsCount)}
              icon={Clock3}
              tone="amber"
            />
            <PageHeaderStat
              label="Confirmadas"
              value={String(confirmedAssignmentsCount)}
              icon={CheckCircle2}
              tone="green"
            />
            <PageHeaderStat
              label="Encerradas"
              value={String(closedAssignmentsCount)}
              icon={XCircle}
              tone="slate"
            />
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="gap-4 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">
                  {editingAssignment ? 'Editar designação' : 'Nova designação'}
                </CardTitle>
                <CardDescription>
                  {editingAssignment
                    ? 'Atualize status, observações, destino e tema sem perder o histórico da data.'
                    : 'Escolha o sábado, o orador e o tema do discurso público.'}
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

            <div className="flex flex-wrap gap-2">
              <MetadataChip
                label="Tipo"
                value={selectedMovementOption?.title ?? 'Designação'}
              />
              <MetadataChip
                label="Data"
                tone={selectedEvent ? 'success' : 'pending'}
                value={
                  selectedEvent
                    ? formatTimestampDate(selectedEvent.date)
                    : 'Escolha data'
                }
              />
              <MetadataChip label="Destino" value={destinationSummaryLabel} />
              <MetadataChip
                label="Orador"
                tone={selectedSpeaker ? 'success' : 'pending'}
                value={speakerSummaryLabel}
              />
              <MetadataChip
                label="Tema"
                tone={selectedTheme ? 'success' : 'pending'}
                value={themeSummaryLabel}
              />
              <MetadataChip
                label="Status"
                tone={watchedStatus === 'confirmed' ? 'success' : 'warning'}
                value={selectedStatusOption?.title ?? assignmentStatusLabels[watchedStatus]}
              />
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={submitHandler}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Tipo de designação</span>
                  <div className="grid gap-2 min-[440px]:grid-cols-3 sm:gap-3">
                    {movementOptions.map((option) => {
                      const Icon = option.icon

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            'min-h-[76px] rounded-xl border px-3 py-2.5 text-left text-sm transition sm:px-3.5 sm:py-3',
                            getMovementOptionToneClassName(
                              option.value,
                              movementType === option.value,
                            ),
                          )}
                          onClick={() => handleMovementTypeChange(option.value)}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-medium leading-5 text-foreground">
                              {option.title}
                            </span>
                            <Icon
                              className={cn(
                                'mt-0.5 size-4 shrink-0',
                                getMovementOptionIconClassName(option.value),
                              )}
                            />
                          </span>
                          <span className="mt-1 block text-xs leading-4 text-muted-foreground min-[440px]:line-clamp-2">
                            {option.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Data da reunião</span>
                  <input type="hidden" {...register('calendarEventId')} />

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                    <label className="block">
                      <span className="sr-only">Data da reunião</span>
                      <div className="relative w-full sm:max-w-[220px]">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="date"
                          className="h-12 pl-10 text-base font-semibold tracking-[0.02em]"
                          value={meetingDateValue}
                          onChange={(event) => handleMeetingDateChange(event.target.value)}
                        />
                      </div>
                    </label>

                    {quickSelectableEvents.length > 0 ? (
                      <div className="flex flex-wrap gap-2 lg:flex-1 lg:justify-end">
                        {quickSelectableEvents.map((event) => {
                          const isSelected = event.id === watchedCalendarEventId

                          return (
                            <button
                              key={event.id}
                              type="button"
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                                isSelected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-background text-muted-foreground hover:bg-accent',
                              )}
                              onClick={() =>
                                handleMeetingDateChange(getLocalDateKey(event.date.toDate()))
                              }
                            >
                              {formatTimestampDate(event.date)}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <MetadataChip
                      label="Filtro"
                      tone={isMeetingDayFilterUnavailable ? 'warning' : 'pending'}
                      value={
                        isMeetingDayFilterActive
                          ? `${getMeetingDayHelperLabel(localMeetingDay)} da congregação local`
                          : isMeetingDayFilterUnavailable
                            ? `sem datas de ${localMeetingDay.toLowerCase()}`
                            : 'calendário operacional'
                      }
                    />
                    <MetadataChip
                      label="Atalho"
                      value={`${quickSelectableEvents.length} próximas datas`}
                    />
                  </div>
                  <p className="sr-only">
                    {isMeetingDayFilterActive
                      ? `Mostrando somente ${getMeetingDayHelperLabel(localMeetingDay)} da congregação local.`
                      : isMeetingDayFilterUnavailable
                        ? `A congregação local está marcada com reunião em ${localMeetingDay.toLowerCase()}, mas não encontrei datas desse dia neste ano; por isso mantive todas as datas carregadas.`
                        : 'Escolha uma data já carregada no calendário operacional.'}
                  </p>
                  {dateFieldFeedback ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {dateFieldFeedback}
                    </p>
                  ) : null}
                  {errors.calendarEventId ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.calendarEventId.message}
                    </p>
                  ) : null}
                </div>

                <input type="hidden" {...register('localCongregationId')} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      {movementType === 'incoming'
                        ? 'Congregação do orador visitante'
                        : movementType === 'outgoing'
                          ? 'Congregação de destino'
                          : 'Congregação base'}
                    </span>

                    {movementType === 'incoming' ? (
                      <select
                        className={selectClassName}
                        value={visitorCongregationFilterId}
                        onChange={(event) =>
                          handleVisitorCongregationFilterChange(event.target.value)
                        }
                      >
                        <option value="">Escolha a congregação do visitante</option>
                        {visitorCongregationFilterOptions.map((congregation) => (
                          <option key={congregation.id} value={congregation.id}>
                            {congregation.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className={selectClassName}
                        value={watchedLocalCongregationId}
                        onChange={(event) =>
                          setValue('localCongregationId', event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        disabled={movementType === 'local'}
                      >
                        <option value="">
                          {movementType === 'local'
                            ? 'Congregação local base'
                            : 'Selecione a congregação'}
                        </option>
                        {destinationOptions.map((congregation) => (
                          <option key={congregation.id} value={congregation.id}>
                            {congregation.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <MetadataChip
                        label="Destino"
                        tone={selectedDestinationCongregation ? 'success' : 'pending'}
                        value={
                          movementType === 'incoming'
                            ? selectedVisitorCongregation?.name ?? 'Escolha origem'
                            : movementType === 'outgoing'
                              ? selectedDestinationCongregation?.name ?? 'Escolha destino'
                              : baseLocalCongregation?.name ?? 'Sem base local'
                        }
                      />
                    </div>
                    {errors.localCongregationId ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.localCongregationId.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      {movementType === 'incoming' ? 'Orador visitante' : 'Orador local'}
                    </span>
                    <select
                      className={selectClassName}
                      {...speakerFieldRegistration}
                      disabled={movementType === 'incoming' && visitorCongregationFilterId.length === 0}
                    >
                      <option value="">
                        {movementType === 'incoming'
                          ? visitorCongregationFilterId.length === 0
                            ? 'Escolha primeiro a congregação do visitante'
                            : 'Selecione o orador visitante'
                          : 'Selecione o orador local'}
                      </option>
                      {speakerOptions.map((speaker) => (
                        <option key={speaker.id} value={speaker.id}>
                          {movementType === 'incoming'
                            ? `${speaker.name} - ${speaker.congregationName ?? 'Sem congregação'}`
                            : speaker.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <MetadataChip
                        label="Lista"
                        tone={hasSpeakerOptions ? 'success' : 'pending'}
                        value={
                          movementType === 'incoming'
                            ? selectedVisitorCongregation
                              ? `${speakerOptions.length} visitante(s)`
                              : 'aguardando congregação'
                            : baseLocalCongregation
                              ? `${speakerOptions.length} local(is)`
                              : 'sem base local'
                        }
                      />
                    </div>
                    {errors.speakerId ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.speakerId.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                <div className="space-y-2">
                  <input type="hidden" {...register('themeId')} />
                  <div className="rounded-xl border border-border bg-slate-50/80 p-3 dark:bg-background/70 sm:p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-sm font-medium text-foreground">Tema</span>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {selectedSpeaker
                            ? 'Filtre e escolha um dos temas do orador.'
                            : 'Escolha o orador para liberar os temas.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <MetadataChip
                          label="Disponíveis"
                          tone={selectedSpeaker ? 'success' : 'pending'}
                          value={`${filteredSpeakerThemeOptions.length} tema(s)`}
                        />
                        {selectedTheme ? (
                          <MetadataChip
                            label="Categoria"
                            value={getThemeCategoryLabel(selectedTheme.category)}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-end">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Categoria</span>
                        <select
                          className={selectClassName}
                          value={themeCategoryFilter}
                          onChange={(event) =>
                            setThemeCategoryFilter(event.target.value as ThemeCategoryFilter)
                          }
                          disabled={!selectedSpeaker}
                        >
                          <option value="all">Todas as categorias</option>
                          {themeCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Buscar tema</span>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={themeSearchTerm}
                            onChange={(event) => setThemeSearchTerm(event.target.value)}
                            placeholder="Buscar por número, nome ou categoria"
                            className="h-11 pl-10"
                            disabled={!selectedSpeaker}
                          />
                        </div>
                      </label>
                    </div>

                    <div className="mt-3 space-y-3">
                      {selectedTheme ? (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">
                                Tema {selectedTheme.number}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {selectedTheme.title}
                              </p>
                            </div>
                            <Badge variant="outline" className="w-fit">
                              {getThemeCategoryLabel(selectedTheme.category)}
                            </Badge>
                          </div>
                        </div>
                      ) : null}

                      {selectedSpeaker ? (
                        filteredSpeakerThemeOptions.length > 0 ? (
                          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {filteredSpeakerThemeOptions.map((theme) => {
                              const isSelected = theme.id === watchedThemeId

                              return (
                                <button
                                  key={theme.id}
                                  type="button"
                                  className={cn(
                                    'w-full rounded-xl border px-3 py-2.5 text-left transition sm:px-4 sm:py-3',
                                    isSelected
                                      ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                                      : 'border-border bg-background text-muted-foreground hover:bg-accent',
                                  )}
                                  onClick={() => handleThemeSelection(theme.id)}
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-foreground">
                                        Tema {theme.number}
                                      </p>
                                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        {theme.title}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="w-fit shrink-0">
                                      {getThemeCategoryLabel(theme.category)}
                                    </Badge>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm leading-6 text-muted-foreground">
                            Nenhum tema do orador corresponde ao filtro atual. Ajuste a categoria ou a busca para continuar.
                          </div>
                        )
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm leading-6 text-muted-foreground">
                          Escolha o orador para liberar os temas.
                        </div>
                      )}
                    </div>
                  </div>

                  {errors.themeId ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.themeId.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {statusOptionsForForm.map((option) => {
                      const disabled =
                        !editingAssignment && !creatableStatusValues.includes(option.value)
                      const StatusIcon = option.icon

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            'flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition',
                            watchedStatus === option.value
                              ? 'border-primary bg-primary/8 text-foreground shadow-sm'
                              : 'border-border bg-background text-muted-foreground hover:bg-accent',
                            disabled && 'cursor-not-allowed opacity-50 hover:bg-background',
                          )}
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
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-md border',
                              watchedStatus === option.value
                                ? 'border-primary/25 bg-primary/10 text-primary'
                                : 'border-border bg-muted/60 text-muted-foreground',
                            )}
                          >
                            <StatusIcon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground">
                              {option.title}
                            </span>
                            <span className="mt-0.5 block text-xs leading-4">
                              {option.shortDescription}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {!editingAssignment ? (
                    <MetadataChip
                      label="Disponíveis após salvar"
                      value="recusado, cancelado e substituído"
                    />
                  ) : null}
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3.5">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-border text-primary focus:ring-primary"
                    disabled={
                      !isAssignmentCoveringCalendarSlot(watchedStatus) ||
                      selectedSpeakerMissingEmail ||
                      !emailDeliveryConfigured
                    }
                    {...register('emailNotificationsEnabled')}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      Ativar lembrete automático por e-mail
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      Quando ligado, o sistema envia um lembrete 4 dias antes da reunião. A confirmação é enviada somente pelo botão de e-mail. Por padrão fica desligado.
                    </span>
                    {!isAssignmentCoveringCalendarSlot(watchedStatus) ? (
                      <span className="mt-1 block text-xs text-amber-700 dark:text-amber-200">
                        Disponível apenas para designações pendentes ou confirmadas.
                      </span>
                    ) : selectedSpeakerMissingEmail ? (
                      <span className="mt-1 block text-xs text-amber-700 dark:text-amber-200">
                        Cadastre o e-mail do orador para ativar o lembrete automático.
                      </span>
                    ) : !emailDeliveryConfigured ? (
                      <span className="mt-1 block text-xs text-amber-700 dark:text-amber-200">
                        {emailDeliveryUnavailableMessage}
                      </span>
                    ) : null}
                  </span>
                </label>

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
                  {selectableEvents.length === 0
                    ? 'Nenhum sábado disponível foi carregado para salvar uma designação.'
                    : !hasDestinations
                      ? movementType === 'outgoing'
                        ? 'Cadastre ao menos uma congregação parceira ativa para registrar saídas locais.'
                        : 'Cadastre ao menos uma congregação local ativa para registrar entradas ou designações locais.'
                      : needsVisitorCongregationFilter
                        ? 'Escolha primeiro a congregação do orador visitante para liberar os irmãos disponíveis.'
                      : !hasSpeakerOptions
                        ? movementType === 'incoming'
                          ? 'Nenhum orador visitante ativo foi encontrado para a congregação escolhida.'
                          : 'Cadastre ao menos um orador local ativo para registrar esta operação.'
                        : 'Selecione um orador com temas ativos para concluir a designação.'}
                </div>
              ) : null}

              {selectedSpeakerMissingEmail ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  <MailWarning className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Orador sem e-mail cadastrado</p>
                    <p className="mt-1">
                      Pode salvar, mas lembretes e convite do Google Calendar ficam pendentes até atualizar o cadastro.
                    </p>
                  </div>
                </div>
              ) : null}

              {selectedEventCoveredByOtherAssignment ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Data já coberta</p>
                    <p className="mt-1">
                      {currentOperationalAssignment?.speakerName} está com status{' '}
                      {currentOperationalAssignment
                        ? assignmentStatusLabels[currentOperationalAssignment.status]
                        : 'operacional'}
                      .
                    </p>
                    {!editingAssignment && isAssignmentCoveringCalendarSlot(watchedStatus) ? (
                      <p className="mt-1">
                        Ao salvar, a designação anterior será marcada como substituída.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {recentThemeUsage ? (
                <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Tema usado recentemente</p>
                    <p className="mt-1">
                      Tema {recentThemeUsage.themeNumber}, em{' '}
                      {formatTimestampDate(recentThemeUsage.eventDate)}, por{' '}
                      {recentThemeUsage.speakerName} para{' '}
                      {recentThemeUsage.localCongregationName}.
                    </p>
                  </div>
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
              <div className="flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
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
                <option value="local">Designações locais</option>
                <option value="outgoing">Discursos fora</option>
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
                    className="h-56 animate-pulse rounded-xl border border-border bg-background"
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
                    : 'Crie a primeira designação para começar a cobrir os sábados.'
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
                  const canRequestManualEmail =
                    isAssignmentCoveringCalendarSlot(assignment.status)
                  const manualConfirmationNotification = notificationsById.get(
                    `${assignment.id}__manual`,
                  )
                  const currentManualConfirmationNotification =
                    manualConfirmationNotification &&
                    isTimestampInCurrentAssignmentRevision(
                      manualConfirmationNotification.updatedAt,
                      assignment.updatedAt,
                    )
                      ? manualConfirmationNotification
                      : null
                  const manualConfirmationStatus =
                    currentManualConfirmationNotification?.status
                  const manualEmailFailed = manualConfirmationStatus === 'failed'
                  const manualEmailAlreadyRequested = Boolean(
                    isTimestampInCurrentAssignmentRevision(
                      assignment.manualConfirmationEmailRequestedAt,
                      assignment.updatedAt,
                    ) && !manualEmailFailed,
                  )
                  const manualEmailAlreadyQueuedOrSent =
                    manualConfirmationStatus === 'pending' ||
                    manualConfirmationStatus === 'sent'
                  const manualEmailActionResolved =
                    manualEmailAlreadyRequested ||
                    manualEmailAlreadyQueuedOrSent
                  const manualEmailActionDisabled =
                    isSubmitting ||
                    !emailDeliveryConfigured ||
                    manualEmailActionResolved
                  const ManualEmailActionIcon =
                    manualEmailFailed
                      ? MailWarning
                      : manualEmailAlreadyRequested ||
                          manualConfirmationStatus === 'sent'
                      ? CheckCircle2
                      : MailCheck
                  const manualEmailActionLabel = !emailDeliveryConfigured
                    ? 'E-mail indisponível'
                    : manualEmailFailed
                      ? 'Tentar novamente'
                      : manualEmailAlreadyRequested ||
                          manualConfirmationStatus === 'sent'
                        ? 'E-mail solicitado'
                        : manualConfirmationStatus === 'pending'
                          ? 'Enviando e-mail'
                          : 'E-mail agora'
                  const emailErrorMessage =
                    currentManualConfirmationNotification?.errorMessage?.trim() || ''
                  const linkedCalendarEvent =
                    calendarEventsById.get(assignment.calendarEventId) ?? null
                  const assignmentSpeaker = speakersById.get(assignment.speakerId) ?? null
                  const assignmentDestinationCongregation =
                    congregationsById.get(assignment.localCongregationId) ?? null
                  const whatsappConfirmationUrl = assignmentSpeaker
                    ? buildAssignmentWhatsAppConfirmationUrl({
                        assignment,
                        destinationCongregation: assignmentDestinationCongregation,
                        speaker: assignmentSpeaker,
                      })
                    : null
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
                  const hasCommunicationActions = Boolean(
                    googleCalendarSyncState?.canShowAction ||
                      canRequestManualEmail ||
                      emailErrorMessage ||
                      whatsappConfirmationUrl,
                  )

                  return (
                    <div
                      key={assignment.id}
                      className="rounded-xl border border-border bg-background p-3.5 sm:p-4"
                    >
                      <div className="space-y-4">
                        <div className="min-w-0">
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

                          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:max-w-2xl">
                            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                              <div className="flex items-start gap-3">
                                <CalendarDays className="mt-0.5 size-4 text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Sábado
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

                            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
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
                                className={`rounded-xl border px-4 py-3.5 ${getGoogleCalendarSyncBadgeClassName(
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

                        <div className="grid gap-3 border-t border-border pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                          {hasCommunicationActions ? (
                            <div className="min-w-0 space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Comunicação
                              </p>
                              <div
                                className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap"
                                role="group"
                                aria-label="Ações de comunicação"
                              >
                                {googleCalendarSyncState?.canShowAction ? (
                                  <Button
                                    className="w-full lg:w-auto"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRequestManualGoogleCalendarSync(assignment)}
                                    disabled={isSubmitting || !googleCalendarSyncState.canRequestSync}
                                  >
                                    <GoogleCalendarButtonMark />
                                    Sincronizar Agenda
                                  </Button>
                                ) : null}
                                {canRequestManualEmail && emailDeliveryConfigured ? (
                                  <Button
                                    className="w-full lg:w-auto"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRequestManualConfirmationEmail(assignment)}
                                    disabled={manualEmailActionDisabled}
                                  >
                                    <ManualEmailActionIcon className="size-4" />
                                    {manualEmailActionLabel}
                                  </Button>
                                ) : null}
                                {emailErrorMessage ? (
                                  <span
                                    className="inline-flex min-h-9 min-w-0 items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 sm:col-span-2 lg:w-auto dark:bg-rose-950/30 dark:text-rose-200"
                                    title={emailErrorMessage}
                                  >
                                    <MailWarning className="size-4 shrink-0" />
                                    <span className="truncate">Falha no e-mail: {emailErrorMessage}</span>
                                  </span>
                                ) : !emailDeliveryConfigured && canRequestManualEmail ? (
                                  <span
                                    className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 sm:col-span-2 lg:w-auto dark:bg-amber-950/30 dark:text-amber-200"
                                    title={emailDeliveryUnavailableMessage}
                                  >
                                    <MailWarning className="size-4 shrink-0" />
                                    E-mail indisponível
                                  </span>
                                ) : null}
                                {whatsappConfirmationUrl ? (
                                  <a
                                    className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-700 sm:col-span-2 lg:w-auto dark:bg-card dark:text-foreground dark:hover:bg-accent"
                                    href={whatsappConfirmationUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    <MessageCircle className="size-4" />
                                    Confirmar por WhatsApp
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-2 lg:justify-self-end">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:text-right">
                              Gerenciar
                            </p>
                            <div
                              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end"
                              role="group"
                              aria-label="Ações da designação"
                            >
                              {hasQuickConfirm ? (
                                <Button
                                  className="w-full lg:w-auto"
                                  size="sm"
                                  onClick={() => handleQuickConfirm(assignment.id)}
                                  disabled={isSubmitting}
                                >
                                  <CheckCircle2 className="size-4" />
                                  Confirmar
                                </Button>
                              ) : null}
                              {canQuickCancel ? (
                                <Button
                                  className="w-full lg:w-auto"
                                  size="sm"
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
                                  className="w-full lg:w-auto"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartReplacement(assignment)}
                                  disabled={isSubmitting}
                                >
                                  <ArrowRightLeft className="size-4" />
                                  Substituir
                                </Button>
                              ) : null}
                              <Button
                                className="w-full lg:w-auto"
                                size="sm"
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
