import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  MailCheck,
  MailWarning,
  MessageCircle,
  Mic2,
  Plus,
  Printer,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EntityPageShell } from '@/components/app/entity-page-shell'
import { EmptyState } from '@/components/app/empty-state'
import { MetadataChip } from '@/components/app/metadata-chip'
import { MetricStrip } from '@/components/app/metric-strip'
import { PageHeader } from '@/components/app/page-header'
import { StatusPill } from '@/components/app/status-pill'
import { useAuth } from '@/components/auth/use-auth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import {
  emailDeliveryUnavailableMessage,
  isEmailDeliveryConfigured,
} from '@/config/email'
import { useRequestManualAssignmentConfirmationEmailMutation } from '@/hooks/use-assignments'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { useDashboardSnapshotQuery } from '@/hooks/use-dashboard'
import { useNotificationByIdQuery } from '@/hooks/use-notifications'
import { useSpeakerByIdQuery } from '@/hooks/use-speakers'
import { cn } from '@/lib/utils'
import type {
  AssignmentDocument,
  CongregationDocument,
  FirestoreRecord,
} from '@/types/firestore'
import {
  getAssignmentMovementLabel,
  inferAssignmentMovementType,
  type AssignmentMovementType,
} from '@/utils/assignment-history'
import {
  assignmentStatusLabels,
  calendarEventTypeLabels,
  doesCalendarEventBlockAssignments,
} from '@/utils/calendar-events'
import { buildAssignmentWhatsAppConfirmationUrl } from '@/utils/assignment-whatsapp'
import { isTimestampInCurrentAssignmentRevision } from '@/utils/notification-sync'
import {
  buildDashboardSaturdayEntries,
} from '@/utils/dashboard'

type DashboardSaturdayEntryView = ReturnType<
  typeof buildDashboardSaturdayEntries
>[number]

type DashboardEntryStatus = 'confirmed' | 'pending' | 'event'
type DashboardTab = 'inCongregation' | 'outsideCongregation'
type OperationalAssignmentDocument = AssignmentDocument & {
  status: 'pending' | 'confirmed'
}

type DashboardOutgoingAssignmentEntry = {
  assignment: FirestoreRecord<OperationalAssignmentDocument>
  destinationCongregation: FirestoreRecord<CongregationDocument> | null
  movementLabel: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível carregar o dashboard agora.'
}

function formatInlineDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

function getEntryStatus(entry: DashboardSaturdayEntryView): DashboardEntryStatus {
  if (doesCalendarEventBlockAssignments(entry.event)) {
    return 'event'
  }

  if (entry.assignment?.status === 'confirmed') {
    return 'confirmed'
  }

  return 'pending'
}

function getEntryStatusLabel(entry: DashboardSaturdayEntryView) {
  if (doesCalendarEventBlockAssignments(entry.event)) {
    return calendarEventTypeLabels[entry.event.type]
  }

  if (entry.assignment) {
    return assignmentStatusLabels[entry.assignment.status]
  }

  return 'Sem designação'
}

function getHighlightStyle(status: DashboardEntryStatus) {
  if (status === 'confirmed') {
    return {
      wrapperClass:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
      Icon: CheckCircle2,
    }
  }

  if (status === 'event') {
    return {
      wrapperClass:
        'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
      Icon: Sparkles,
    }
  }

  return {
    wrapperClass:
      'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    Icon: Clock3,
  }
}

function getAssignmentCreateHref(entry: DashboardSaturdayEntryView) {
  const params = new URLSearchParams({
    evento: entry.event.id,
    ano: String(entry.event.year),
  })

  return `/designacoes?${params.toString()}`
}

function isOperationalAssignment(
  assignment: FirestoreRecord<AssignmentDocument>,
): assignment is FirestoreRecord<OperationalAssignmentDocument> {
  return assignment.status === 'pending' || assignment.status === 'confirmed'
}

function getAssignmentMovement(
  assignment: FirestoreRecord<AssignmentDocument>,
  congregationsById: Map<string, FirestoreRecord<CongregationDocument>>,
): AssignmentMovementType {
  return inferAssignmentMovementType(assignment, congregationsById)
}

function getDashboardTabClass(isActive: boolean) {
  return cn(
    'inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-black transition-colors sm:flex-none',
    isActive
      ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white'
      : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-card dark:text-foreground dark:hover:bg-blue-500/10 dark:hover:text-blue-200',
  )
}

const cardClass =
  'overflow-hidden rounded-lg border-gray-200 shadow-sm'

const quickActionClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-border dark:bg-card dark:text-foreground'
const emailDeliveryConfigured = isEmailDeliveryConfigured()

const dashboardShortcutClass =
  'flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-border dark:bg-card dark:text-foreground'

export function DashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [activeTab, setActiveTab] = useState<DashboardTab>('inCongregation')
  const { user } = useAuth()
  const toast = useToast()
  const requestManualEmailMutation =
    useRequestManualAssignmentConfirmationEmailMutation()
  const congregationsQuery = useCongregationsQuery()
  const dashboardSnapshotQuery = useDashboardSnapshotQuery(today)

  const calendarEvents = dashboardSnapshotQuery.data?.calendarEvents ?? []
  const assignments = dashboardSnapshotQuery.data?.assignments ?? []
  const congregations = congregationsQuery.data ?? []
  const congregationsById = new Map(
    congregations.map((congregation) => [congregation.id, congregation]),
  )
  const localCongregation =
    congregations.find((congregation) => congregation.isLocal) ?? null
  const allUpcomingSaturdayEntries = buildDashboardSaturdayEntries(
    calendarEvents,
    assignments,
    today,
    10,
  )
  const upcomingSaturdayEntries = allUpcomingSaturdayEntries.map((entry) => {
    if (!entry.assignment) {
      return entry
    }

    const movementType = getAssignmentMovement(entry.assignment, congregationsById)

    if (movementType !== 'outgoing') {
      return entry
    }

    return {
      ...entry,
      assignment: null,
      isUnassigned: !doesCalendarEventBlockAssignments(entry.event),
      isAwaitingResponse: false,
    }
  })
  const outgoingAssignmentEntries: DashboardOutgoingAssignmentEntry[] = assignments
    .filter(isOperationalAssignment)
    .filter((assignment) => {
      if (assignment.eventDate.toDate().getTime() < today.getTime()) {
        return false
      }

      return getAssignmentMovement(assignment, congregationsById) === 'outgoing'
    })
    .sort(
      (left, right) =>
        left.eventDate.toMillis() - right.eventDate.toMillis(),
    )
    .map((assignment) => ({
      assignment,
      destinationCongregation:
        congregationsById.get(assignment.localCongregationId) ?? null,
      movementLabel: getAssignmentMovementLabel('outgoing'),
    }))
  const nextSaturdayEntry = upcomingSaturdayEntries[0] ?? null
  const nextAssignment = nextSaturdayEntry?.assignment ?? null
  const remainingSaturdayEntries = upcomingSaturdayEntries.slice(1)
  const nextSpeakerQuery = useSpeakerByIdQuery(nextAssignment?.speakerId)
  const manualConfirmationNotificationQuery = useNotificationByIdQuery(
    nextAssignment ? `${nextAssignment.id}__manual` : '',
    Boolean(nextAssignment),
  )
  const nextSpeaker = nextSpeakerQuery.data
  const combinedError =
    congregationsQuery.error ??
    dashboardSnapshotQuery.error
  const isLoading =
    congregationsQuery.isLoading ||
    dashboardSnapshotQuery.isLoading

  const nextSaturdayStatus = nextSaturdayEntry
    ? getEntryStatus(nextSaturdayEntry)
    : 'pending'
  const highlightStyle = getHighlightStyle(nextSaturdayStatus)
  const HighlightIcon = highlightStyle.Icon
  const nextSpeakerEmail = nextSpeaker?.email.trim() ?? ''
  const nextDestinationCongregation = nextAssignment
    ? congregations.find(
        (congregation) => congregation.id === nextAssignment.localCongregationId,
      ) ?? null
    : null
  const nextSpeakerWhatsAppLink =
    nextAssignment && nextSpeaker
      ? buildAssignmentWhatsAppConfirmationUrl({
          assignment: nextAssignment,
          destinationCongregation: nextDestinationCongregation,
          speaker: nextSpeaker,
        })
      : null
  const manualConfirmationNotification =
    manualConfirmationNotificationQuery.data ?? null
  const currentManualConfirmationNotification =
    manualConfirmationNotification &&
    nextAssignment &&
    isTimestampInCurrentAssignmentRevision(
      manualConfirmationNotification.updatedAt,
      nextAssignment.updatedAt,
    )
      ? manualConfirmationNotification
      : null
  const manualConfirmationStatus =
    currentManualConfirmationNotification?.status ?? null
  const isNextAssignmentConfirmed = nextAssignment?.status === 'confirmed'
  const manualEmailFailed = manualConfirmationStatus === 'failed'
  const manualEmailAlreadyRequested = Boolean(
    nextAssignment &&
      isTimestampInCurrentAssignmentRevision(
        nextAssignment.manualConfirmationEmailRequestedAt,
        nextAssignment.updatedAt,
      ) &&
      !manualEmailFailed,
  )
  const manualEmailAlreadyQueuedOrSent =
    manualConfirmationStatus === 'pending' ||
    manualConfirmationStatus === 'sent'
  const emailActionResolved =
    isNextAssignmentConfirmed ||
    manualEmailAlreadyRequested ||
    manualEmailAlreadyQueuedOrSent
  const emailActionDisabled =
    requestManualEmailMutation.isPending ||
    !emailDeliveryConfigured ||
    emailActionResolved
  const EmailActionIcon =
    isNextAssignmentConfirmed
      ? CheckCircle2
      : manualEmailFailed
      ? MailWarning
      : manualEmailAlreadyRequested ||
          manualConfirmationStatus === 'sent'
      ? CheckCircle2
      : MailCheck
  const emailActionLabel = isNextAssignmentConfirmed
    ? 'Confirmado'
    : !emailDeliveryConfigured
      ? 'E-mail indisponível'
      : manualEmailFailed
      ? 'Tentar novamente'
      : manualEmailAlreadyRequested || manualConfirmationStatus === 'sent'
        ? 'E-mail solicitado'
        : manualConfirmationStatus === 'pending'
          ? 'Enviando e-mail'
          : 'E-mail'
  const emailErrorMessage =
    currentManualConfirmationNotification?.errorMessage?.trim() || ''
  const dashboardShortcuts = [
    {
      href: '/designacoes',
      label: 'Designações',
      Icon: ClipboardList,
    },
    {
      href: '/oradores',
      label: 'Oradores',
      Icon: UsersRound,
    },
    {
      href: '/temas',
      label: 'Temas',
      Icon: Mic2,
    },
    {
      href: '/congregacoes',
      label: 'Congregações',
      Icon: Building2,
    },
  ] as const
  const activeTabLabel =
    activeTab === 'inCongregation' ? 'Na congregação' : 'Fora da congregação'
  const printGeneratedAt = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const nextSaturdayDateLabel = nextSaturdayEntry
    ? formatInlineDate(nextSaturdayEntry.event.date.toDate())
    : ''
  const nextSaturdayMeetingTime = localCongregation?.meetingTime ?? 'Horário a definir'
  const nextSaturdayBlocksAssignments = nextSaturdayEntry
    ? doesCalendarEventBlockAssignments(nextSaturdayEntry.event)
    : false
  const nextSaturdayHeadline = nextSaturdayEntry
    ? nextSaturdayEntry.assignment
      ? nextSaturdayEntry.assignment.speakerName
      : nextSaturdayBlocksAssignments
        ? nextSaturdayEntry.event.title
        : 'Sem designação'
    : ''
  const nextSaturdayCongregation = nextSaturdayEntry?.assignment
    ? nextSaturdayEntry.assignment.originCongregationName
    : 'Ainda não definida'
  const nextSaturdayTheme = nextSaturdayEntry?.assignment
    ? `${nextSaturdayEntry.assignment.themeNumber} - ${nextSaturdayEntry.assignment.themeTitle}`
    : 'Ainda não definido'
  const uncoveredSaturdayCount = upcomingSaturdayEntries.filter(
    (entry) => !entry.assignment && !doesCalendarEventBlockAssignments(entry.event),
  ).length
  const pendingAssignmentCount = upcomingSaturdayEntries.filter(
    (entry) => entry.assignment?.status === 'pending',
  ).length
  const confirmedAssignmentCount = upcomingSaturdayEntries.filter(
    (entry) => entry.assignment?.status === 'confirmed',
  ).length
  function handlePrintDashboardTab() {
    window.print()
  }

  async function handleRequestManualConfirmationEmail() {
    if (!nextAssignment) {
      return
    }

    if (nextAssignment.status === 'confirmed') {
      return
    }

    if (!emailDeliveryConfigured) {
      toast.error(emailDeliveryUnavailableMessage)
      return
    }

    if (!user) {
      toast.error('Sua sessão expirou. Entre novamente para continuar.')
      return
    }

    const isRetry = manualEmailFailed
    const confirmed = window.confirm(
      isRetry
        ? `Tentar enviar novamente o e-mail de confirmação para ${nextAssignment.speakerName}?`
        : `Enviar agora o e-mail de confirmação para ${nextAssignment.speakerName}? Depois de enviado, esta ação ficará indisponível para a designação.`,
    )

    if (!confirmed) {
      return
    }

    try {
      const result = await requestManualEmailMutation.mutateAsync({
        id: nextAssignment.id,
        actorUid: user.uid,
        actorName: user.displayName ?? user.email ?? null,
      })
      if (result === 'sent') {
        toast.success('E-mail de confirmação enviado com sucesso.')
      } else {
        toast.error('O envio falhou temporariamente. Uma nova tentativa foi agendada.')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <EntityPageShell className="dashboard-print-surface mx-auto max-w-7xl">
      <div className="app-print-hidden">
        <PageHeader
          eyebrow="Painel"
          title="Dashboard"
          description="Acompanhe o próximo discurso, lacunas de cobertura e atalhos principais da operação."
        />
      </div>

      <div className="app-print-hidden">
        <MetricStrip
          items={[
            {
              label: 'Próximas datas',
              value: String(upcomingSaturdayEntries.length),
              detail: 'Janela operacional',
              icon: CalendarDays,
              tone: 'blue',
            },
            {
              label: 'Sem designação',
              value: String(uncoveredSaturdayCount),
              detail: 'Precisam de ação',
              icon: Clock3,
              tone: 'amber',
            },
            {
              label: 'Confirmadas',
              value: String(confirmedAssignmentCount),
              detail: 'Cobertura fechada',
              icon: CheckCircle2,
              tone: 'green',
            },
            {
              label: 'Discursos fora',
              value: String(outgoingAssignmentEntries.length),
              detail:
                pendingAssignmentCount > 0
                  ? `${pendingAssignmentCount} pendente(s) na congregação`
                  : 'Locais em outras congregações',
              icon: UsersRound,
              tone: 'slate',
            },
          ]}
        />
      </div>

      <section className="space-y-3">
        <div className="app-print-hidden flex flex-col gap-3 rounded-lg border border-gray-200 bg-slate-100 p-2 dark:border-border dark:bg-background sm:flex-row sm:items-center sm:justify-between">
          <div
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            role="tablist"
            aria-label="Visões do dashboard"
          >
            <button
              type="button"
              className={getDashboardTabClass(activeTab === 'inCongregation')}
              onClick={() => setActiveTab('inCongregation')}
              role="tab"
              aria-selected={activeTab === 'inCongregation'}
            >
              Na congregação
            </button>
            <button
              type="button"
              className={getDashboardTabClass(activeTab === 'outsideCongregation')}
              onClick={() => setActiveTab('outsideCongregation')}
              role="tab"
              aria-selected={activeTab === 'outsideCongregation'}
            >
              Fora da congregação
            </button>
          </div>
        </div>

        <div className="dashboard-print-header border-b border-slate-200 pb-3">
          <p className="text-xs font-bold uppercase text-slate-500">
            {localCongregation?.name ?? 'Congregação local'}
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {activeTabLabel}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Gerado em {printGeneratedAt}
          </p>
        </div>

        {activeTab === 'inCongregation' ? (
          <div className="dashboard-print-list space-y-3">
            {upcomingSaturdayEntries.length > 0 ? (
              upcomingSaturdayEntries.map((entry) => {
                const assignment = entry.assignment
                const entryBlocksAssignments = doesCalendarEventBlockAssignments(
                  entry.event,
                )
                const statusLabel = getEntryStatusLabel(entry)
                const speakerOrEvent = assignment
                  ? assignment.speakerName
                  : entryBlocksAssignments
                    ? entry.event.title
                    : 'Sem designação'
                const origin = assignment
                  ? assignment.originCongregationName
                  : entryBlocksAssignments
                    ? calendarEventTypeLabels[entry.event.type]
                    : 'A definir'
                const destination = assignment
                  ? assignment.localCongregationName
                  : localCongregation?.name ?? 'Congregação local'
                const theme = assignment
                  ? `${assignment.themeNumber} - ${assignment.themeTitle}`
                  : entryBlocksAssignments
                    ? 'Não se aplica'
                    : 'A definir'
                const notes = assignment?.notes.trim()
                  ? assignment.notes
                  : entryBlocksAssignments
                    ? entry.event.description?.trim() ||
                      'Data bloqueada para designação.'
                    : 'Escolher orador e tema.'

                return (
                  <article
                    key={entry.event.id}
                    className="dashboard-print-card rounded-lg border border-slate-300 p-3 text-slate-900"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Orador/evento
                        </p>
                        <h3 className="text-base font-black leading-tight text-slate-950">
                          {speakerOrEvent}
                        </h3>
                        <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">
                          {theme}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Status
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {statusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-sm">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Data e hora
                        </p>
                        <p className="font-bold text-slate-950">
                          {formatInlineDate(entry.event.date.toDate())}
                          {' · '}
                          {nextSaturdayMeetingTime}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Origem
                        </p>
                        <p className="font-semibold text-slate-800">{origin}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Destino
                        </p>
                        <p className="font-black text-slate-950">{destination}</p>
                      </div>
                    </div>

                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs font-semibold text-slate-600">
                      {notes}
                    </p>
                  </article>
                )
              })
            ) : (
              <p className="py-4 text-sm text-slate-600">
                Nenhum sábado carregado para impressão.
              </p>
            )}
          </div>
        ) : null}

        {activeTab === 'outsideCongregation' ? (
          <div className="dashboard-print-list space-y-3">
            {outgoingAssignmentEntries.length > 0 ? (
              outgoingAssignmentEntries.map(
                ({ assignment, destinationCongregation }) => (
                  <article
                    key={assignment.id}
                    className="dashboard-print-card rounded-lg border border-slate-300 p-3 text-slate-900"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Irmão
                        </p>
                        <h3 className="text-base font-black leading-tight text-slate-950">
                          {assignment.speakerName}
                        </h3>
                        <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">
                          {assignment.themeNumber} - {assignment.themeTitle}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Status
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {assignmentStatusLabels[assignment.status]}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-sm">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Dia e hora
                        </p>
                        <p className="font-bold text-slate-950">
                          {formatInlineDate(assignment.eventDate.toDate())}
                          {destinationCongregation
                            ? ` · ${destinationCongregation.meetingDay}, ${destinationCongregation.meetingTime}`
                            : ' · Horário a definir'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Destino
                        </p>
                        <p className="font-black text-slate-950">
                          {assignment.localCongregationName}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Endereço
                        </p>
                        <p className="font-semibold text-slate-800">
                          {destinationCongregation?.address || 'A definir'}
                        </p>
                      </div>
                    </div>

                    {assignment.notes ? (
                      <p className="mt-2 border-t border-slate-100 pt-2 text-xs font-semibold text-slate-600">
                        {assignment.notes}
                      </p>
                    ) : null}
                  </article>
                ),
              )
            ) : (
              <p className="py-4 text-sm text-slate-600">
                Nenhum discurso fora programado para impressão.
              </p>
            )}
          </div>
        ) : null}

      {activeTab === 'inCongregation' ? (
      <Card className={cn(cardClass, 'app-print-hidden')}>
        <CardHeader className="border-b border-gray-100 bg-white p-4 pb-3 dark:border-border dark:bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-black text-blue-800 dark:text-blue-200 md:text-base">
                <ClipboardList className="size-4" />
                Próximo discurso
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isLoading && !combinedError && nextSaturdayEntry ? (
                <StatusPill status={nextSaturdayStatus}>
                  {getEntryStatusLabel(nextSaturdayEntry)}
                </StatusPill>
              ) : null}
              <button
                type="button"
                className={cn(quickActionClass, 'app-print-hidden')}
                onClick={handlePrintDashboardTab}
              >
                <Printer className="size-3.5" />
                Imprimir
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-4">
          {isLoading ? (
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-slate-50 dark:bg-background">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {!isLoading && combinedError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(combinedError)}
            </div>
          ) : null}

          {!isLoading && !combinedError && !nextSaturdayEntry ? (
            <EmptyState
              className="px-4 py-6"
              title="Nenhum sábado carregado"
              description="Os sábados regulares são calculados automaticamente; confira a conexão com o Firestore para carregar a cobertura."
            />
          ) : null}

          {!isLoading && !combinedError && nextSaturdayEntry ? (
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(230px,0.8fr)]">
                <div className="min-w-0 rounded-lg border border-gray-200 bg-slate-50 px-3 py-3 dark:border-border dark:bg-background">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-black text-slate-800 dark:border-border dark:bg-card dark:text-foreground">
                      {nextSaturdayDateLabel}
                    </span>
                    <span className="text-xs font-bold">{nextSaturdayMeetingTime}</span>
                    {nextSaturdayEntry.assignment ? (
                      <StatusPill status={nextSaturdayEntry.assignment.speakerType}>
                        {nextSaturdayEntry.assignment.speakerType === 'local'
                          ? 'Local'
                          : 'Visitante'}
                      </StatusPill>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-black leading-tight text-slate-900 dark:text-foreground md:text-xl">
                        {nextSaturdayHeadline}
                      </h3>
                      {nextSaturdayEntry.assignment ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Cobertura definida para a próxima reunião pública.
                        </p>
                      ) : nextSaturdayBlocksAssignments ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Data reservada para {calendarEventTypeLabels[nextSaturdayEntry.event.type].toLowerCase()}.
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Ainda falta fechar a cobertura desta data.
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${highlightStyle.wrapperClass}`}
                    >
                      <HighlightIcon className="size-5" />
                    </div>
                  </div>

                  {!nextSaturdayEntry.assignment &&
                  nextSaturdayBlocksAssignments &&
                  nextSaturdayEntry.event.description?.trim() ? (
                    <p className="mt-3 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-medium leading-6 text-violet-800 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-100">
                      {nextSaturdayEntry.event.description}
                    </p>
                  ) : null}

                  {!nextSaturdayEntry.assignment &&
                  !nextSaturdayBlocksAssignments ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                      <span>Ainda falta definir orador e tema para esta data.</span>
                      <Link
                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-black text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
                        to={getAssignmentCreateHref(nextSaturdayEntry)}
                      >
                        <Plus className="size-3.5" />
                        Designar
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap content-start gap-x-5 gap-y-3 border-t border-gray-200 pt-3 dark:border-border lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  <MetadataChip label="Congregação" value={nextSaturdayCongregation} />
                  <MetadataChip label="Tema" value={nextSaturdayTheme} />
                </div>

                <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 dark:border-border dark:bg-background lg:col-span-2 xl:col-span-1">
                  {nextSaturdayEntry.assignment ? (
                    <>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">
                        Contato rápido
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {nextSpeakerEmail ? (
                          <button
                            type="button"
                            className={cn(
                              quickActionClass,
                              emailActionDisabled &&
                                'cursor-not-allowed opacity-70 hover:border-gray-200 hover:bg-white hover:text-slate-700 dark:hover:bg-card dark:hover:text-foreground',
                            )}
                            onClick={() => void handleRequestManualConfirmationEmail()}
                            disabled={emailActionDisabled}
                          >
                            <EmailActionIcon className="size-3.5" />
                            {emailActionLabel}
                          </button>
                        ) : null}
                        {nextSpeakerWhatsAppLink ? (
                          <a
                            className={quickActionClass}
                            href={nextSpeakerWhatsAppLink}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <MessageCircle className="size-3.5" />
                            WhatsApp
                          </a>
                        ) : null}
                        {!nextSpeakerEmail && !nextSpeakerWhatsAppLink ? (
                          <p className="text-sm text-muted-foreground">
                            Sem contato rápido disponível.
                          </p>
                        ) : null}
                      </div>
                      {emailErrorMessage ? (
                        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-5 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                          {emailErrorMessage}
                        </p>
                      ) : nextSpeakerEmail && !emailDeliveryConfigured ? (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                          {emailDeliveryUnavailableMessage}
                        </p>
                      ) : null}
                      {nextSpeakerQuery.isLoading ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Carregando contato do orador...
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex h-full flex-col justify-between gap-3">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">
                        Ação prioritária
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {nextSaturdayBlocksAssignments
                          ? 'Nenhuma cobertura é necessária para esta data.'
                          : 'Priorize a escolha do orador e do tema para fechar este sábado.'}
                      </p>
                      {!nextSaturdayBlocksAssignments ? (
                        <Link
                          className={quickActionClass}
                          to={getAssignmentCreateHref(nextSaturdayEntry)}
                        >
                          <Plus className="size-3.5" />
                          Nova designação
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {remainingSaturdayEntries.length > 0 ? (
                <div className="border-t border-gray-100 pt-3 dark:border-border">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {remainingSaturdayEntries.map((entry) => {
                      const entryStatus = getEntryStatus(entry)
                      const entryBlocksAssignments =
                        doesCalendarEventBlockAssignments(entry.event)

                      return (
                        <div
                          key={entry.event.id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-border dark:bg-card"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {formatInlineDate(entry.event.date.toDate())}
                            </p>
                            <span
                              className={cn(
                                'size-2.5 rounded-full',
                                entryStatus === 'confirmed'
                                  ? 'bg-emerald-500'
                                  : entryStatus === 'event'
                                    ? 'bg-violet-500'
                                    : 'bg-amber-500',
                              )}
                            />
                          </div>
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {getEntryStatusLabel(entry)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.assignment
                              ? entry.assignment.speakerName
                              : entryBlocksAssignments
                                ? entry.event.title
                                : 'Sem designação'}
                          </p>
                          {!entry.assignment &&
                          entryBlocksAssignments &&
                          entry.event.description?.trim() ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {entry.event.description}
                            </p>
                          ) : null}
                          {!entry.assignment && !entryBlocksAssignments ? (
                            <Link
                              className="mt-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-border dark:bg-background dark:text-foreground"
                              to={getAssignmentCreateHref(entry)}
                            >
                              <Plus className="size-3.5" />
                              Designar
                            </Link>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
      ) : (
        <Card className={cn(cardClass, 'app-print-hidden')}>
          <CardHeader className="border-b border-gray-100 bg-white p-4 pb-3 dark:border-border dark:bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-black text-blue-800 dark:text-blue-200 md:text-base">
                  <UsersRound className="size-4" />
                  Fora da congregação
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Próximos discursos em que oradores locais servem outras congregações.
                </p>
              </div>
              <button
                type="button"
                className={cn(quickActionClass, 'app-print-hidden')}
                onClick={handlePrintDashboardTab}
              >
                <Printer className="size-3.5" />
                Imprimir
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-3 md:p-4">
            {isLoading ? (
              <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-slate-50 dark:bg-background">
                <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            {!isLoading && combinedError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {getErrorMessage(combinedError)}
              </div>
            ) : null}

            {!isLoading && !combinedError && outgoingAssignmentEntries.length === 0 ? (
              <EmptyState
                className="px-4 py-6"
                title="Nenhum discurso fora programado"
                description="Quando um orador local for designado para uma congregação parceira, a saída aparecerá aqui."
              />
            ) : null}

            {!isLoading && !combinedError && outgoingAssignmentEntries.length > 0 ? (
              <div className="grid gap-3">
                {outgoingAssignmentEntries.map(
                  ({ assignment, destinationCongregation, movementLabel }) => (
                    <article
                      key={assignment.id}
                      className="dashboard-print-card rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-border dark:bg-card"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                          {movementLabel}
                        </span>
                        <StatusPill status={assignment.status}>
                          {assignmentStatusLabels[assignment.status]}
                        </StatusPill>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {formatInlineDate(assignment.eventDate.toDate())}
                        </span>
                        <span className="ml-auto hidden text-xs font-semibold text-muted-foreground lg:inline">
                          Origem: {assignment.originCongregationName}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
                        <div className="min-w-0">
                          <h3 className="text-base font-black leading-tight text-slate-950 dark:text-foreground">
                            {assignment.speakerName}
                          </h3>
                          <p className="mt-1 text-sm font-semibold leading-snug text-slate-800 dark:text-foreground">
                            {assignment.themeNumber} - {assignment.themeTitle}
                          </p>
                        </div>

                        <div className="min-w-0 space-y-1 text-sm lg:border-l lg:border-slate-200 lg:pl-4 dark:lg:border-border">
                          <p className="font-semibold text-slate-950 dark:text-foreground">
                            <span className="mr-1 text-[10px] font-black uppercase text-muted-foreground">
                              Dia e hora
                            </span>
                            {formatInlineDate(assignment.eventDate.toDate())}
                            {destinationCongregation
                              ? ` · ${destinationCongregation.meetingDay}, ${destinationCongregation.meetingTime}`
                              : ' · Horário a definir'}
                          </p>
                          <p className="font-black text-slate-950 dark:text-foreground">
                            <span className="mr-1 text-[10px] font-black uppercase text-blue-700 dark:text-blue-200">
                              Destino
                            </span>
                            {assignment.localCongregationName}
                          </p>
                          <p className="font-semibold text-muted-foreground">
                            <span className="mr-1 text-[10px] font-black uppercase">
                              Endereço
                            </span>
                            {destinationCongregation?.mapsUrl &&
                            destinationCongregation.address ? (
                              <a
                                className="font-black text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-200"
                                href={destinationCongregation.mapsUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {destinationCongregation.address}
                              </a>
                            ) : (
                              destinationCongregation?.address || 'A definir'
                            )}
                          </p>
                        </div>
                      </div>

                      {assignment.notes ? (
                        <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-muted-foreground dark:border-border">
                          {assignment.notes}
                        </p>
                      ) : null}
                    </article>
                  ),
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
      </section>

      <section className="app-print-hidden grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardShortcuts.map(({ href, label, Icon }) => (
          <Link key={href} className={dashboardShortcutClass} to={href}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
              <Icon className="size-4" />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </section>
    </EntityPageShell>
  )
}
