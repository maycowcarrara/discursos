import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  MailCheck,
  MailWarning,
  MessageCircle,
  Mic2,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/app/empty-state'
import { MetadataChip } from '@/components/app/metadata-chip'
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
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useRequestManualAssignmentConfirmationEmailMutation } from '@/hooks/use-assignments'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { useDashboardSnapshotQuery } from '@/hooks/use-dashboard'
import { useNotificationByIdQuery } from '@/hooks/use-notifications'
import { useSpeakerByIdQuery } from '@/hooks/use-speakers'
import { cn } from '@/lib/utils'
import {
  assignmentStatusLabels,
  calendarEventTypeLabels,
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
  if (entry.event.blocksAssignments) {
    return 'event'
  }

  if (entry.assignment?.status === 'confirmed') {
    return 'confirmed'
  }

  return 'pending'
}

function getEntryStatusLabel(entry: DashboardSaturdayEntryView) {
  if (entry.event.blocksAssignments) {
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

const cardClass =
  'overflow-hidden rounded-xl border-gray-200 shadow-sm'

const quickActionClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-border dark:bg-card dark:text-foreground'
const emailDeliveryConfigured = isEmailDeliveryConfigured()

const dashboardShortcutClass =
  'flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-border dark:bg-card dark:text-foreground'

export function DashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const appSettingsQuery = useAppSettingsQuery()
  const { user } = useAuth()
  const toast = useToast()
  const requestManualEmailMutation =
    useRequestManualAssignmentConfirmationEmailMutation()
  const congregationsQuery = useCongregationsQuery()
  const dashboardSnapshotQuery = useDashboardSnapshotQuery(today)

  const calendarEvents = dashboardSnapshotQuery.data?.calendarEvents ?? []
  const assignments = dashboardSnapshotQuery.data?.assignments ?? []
  const localCongregation =
    congregationsQuery.data?.find((congregation) => congregation.isLocal) ?? null
  const upcomingSaturdayEntries = buildDashboardSaturdayEntries(
    calendarEvents,
    assignments,
    today,
    10,
  )
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
    appSettingsQuery.error ??
    congregationsQuery.error ??
    dashboardSnapshotQuery.error
  const isLoading =
    appSettingsQuery.isLoading ||
    congregationsQuery.isLoading ||
    dashboardSnapshotQuery.isLoading

  const nextSaturdayStatus = nextSaturdayEntry
    ? getEntryStatus(nextSaturdayEntry)
    : 'pending'
  const highlightStyle = getHighlightStyle(nextSaturdayStatus)
  const HighlightIcon = highlightStyle.Icon
  const nextSpeakerEmail = nextSpeaker?.email.trim() ?? ''
  const nextDestinationCongregation = nextAssignment
    ? congregationsQuery.data?.find(
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
    manualEmailAlreadyRequested ||
    manualEmailAlreadyQueuedOrSent
  const emailActionDisabled =
    requestManualEmailMutation.isPending ||
    !emailDeliveryConfigured ||
    emailActionResolved
  const EmailActionIcon =
    manualEmailFailed
      ? MailWarning
      : manualEmailAlreadyRequested ||
          manualConfirmationStatus === 'sent'
      ? CheckCircle2
      : MailCheck
  const emailActionLabel = !emailDeliveryConfigured
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
  const nextSaturdayDateLabel = nextSaturdayEntry
    ? formatInlineDate(nextSaturdayEntry.event.date.toDate())
    : ''
  const nextSaturdayMeetingTime = localCongregation?.meetingTime ?? 'Horário a definir'
  const nextSaturdayHeadline = nextSaturdayEntry
    ? nextSaturdayEntry.assignment
      ? nextSaturdayEntry.assignment.speakerName
      : nextSaturdayEntry.event.blocksAssignments
        ? nextSaturdayEntry.event.title
        : 'Sem designação'
    : ''
  const nextSaturdayCongregation = nextSaturdayEntry?.assignment
    ? nextSaturdayEntry.assignment.originCongregationName
    : 'Ainda não definida'
  const nextSaturdayTheme = nextSaturdayEntry?.assignment
    ? `${nextSaturdayEntry.assignment.themeNumber} - ${nextSaturdayEntry.assignment.themeTitle}`
    : 'Ainda não definido'

  async function handleRequestManualConfirmationEmail() {
    if (!nextAssignment) {
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
    <div className="mx-auto max-w-7xl space-y-3">
      <Card className={cardClass}>
        <CardHeader className="border-b border-gray-100 bg-white p-4 pb-3 dark:border-border dark:bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-black text-blue-800 dark:text-blue-200 md:text-base">
                <ClipboardList className="size-4" />
                Próximo discurso
              </CardTitle>
            </div>
            {!isLoading && !combinedError && nextSaturdayEntry ? (
              <StatusPill status={nextSaturdayStatus}>
                {getEntryStatusLabel(nextSaturdayEntry)}
              </StatusPill>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-4">
          {isLoading ? (
            <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border bg-slate-50 dark:bg-background">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {!isLoading && combinedError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
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
                <div className="min-w-0 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 dark:border-border dark:bg-background">
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
                      ) : nextSaturdayEntry.event.blocksAssignments ? (
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
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${highlightStyle.wrapperClass}`}
                    >
                      <HighlightIcon className="size-5" />
                    </div>
                  </div>

                  {!nextSaturdayEntry.assignment &&
                  !nextSaturdayEntry.event.blocksAssignments ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
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

                <div className="rounded-xl border border-gray-200 bg-slate-50 p-3 dark:border-border dark:bg-background lg:col-span-2 xl:col-span-1">
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
                        {nextSaturdayEntry.event.blocksAssignments
                          ? 'Nenhuma cobertura é necessária para esta data.'
                          : 'Priorize a escolha do orador e do tema para fechar este sábado.'}
                      </p>
                      {!nextSaturdayEntry.event.blocksAssignments ? (
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

                      return (
                        <div
                          key={entry.event.id}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-border dark:bg-card"
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
                              : entry.event.blocksAssignments
                                ? entry.event.title
                                : 'Sem designação'}
                          </p>
                          {!entry.assignment && !entry.event.blocksAssignments ? (
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

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardShortcuts.map(({ href, label, Icon }) => (
          <Link key={href} className={dashboardShortcutClass} to={href}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
              <Icon className="size-4" />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
