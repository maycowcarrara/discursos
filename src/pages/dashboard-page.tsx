import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Mail,
  Mic2,
  Phone,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/app/empty-state'
import { StatusPill } from '@/components/app/status-pill'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { useDashboardSnapshotQuery } from '@/hooks/use-dashboard'
import { useSpeakerByIdQuery } from '@/hooks/use-speakers'
import { cn } from '@/lib/utils'
import {
  assignmentStatusLabels,
  calendarEventTypeLabels,
} from '@/utils/calendar-events'
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

function normalizePhoneLink(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (!digits) {
    return null
  }

  return `tel:${digits}`
}

const cardClass =
  'rounded-[8px] shadow-[0_16px_32px_-30px_rgba(15,23,42,0.22)]'

const quickActionClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'

const dashboardShortcutClass =
  'flex items-center gap-3 rounded-[8px] border border-border/70 bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'

export function DashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const appSettingsQuery = useAppSettingsQuery()
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
  const remainingSaturdayEntries = upcomingSaturdayEntries.slice(1)
  const nextSpeakerQuery = useSpeakerByIdQuery(nextSaturdayEntry?.assignment?.speakerId)
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
  const nextSpeakerPhone = nextSpeaker?.phone.trim() ?? ''
  const nextSpeakerPhoneLink = normalizePhoneLink(nextSpeakerPhone)
  const dashboardShortcuts = [
    {
      href: '/designacoes',
      label: 'Designações',
      Icon: ClipboardList,
    },
    {
      href: '/agenda',
      label: 'Agenda',
      Icon: CalendarDays,
    },
    {
      href: '/oradores',
      label: 'Oradores',
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

  return (
    <div className="mx-auto max-w-7xl space-y-2.5">
      <Card className={cardClass}>
        <CardHeader className="p-3 pb-1.5 md:p-4 md:pb-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base tracking-normal md:text-lg">
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

        <CardContent className="p-3 pt-2 md:p-4 md:pt-2">
          {isLoading ? (
            <div className="flex min-h-28 items-center justify-center rounded-[8px] border border-dashed border-border/80 bg-background">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {!isLoading && combinedError ? (
            <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(combinedError)}
            </div>
          ) : null}

          {!isLoading && !combinedError && !nextSaturdayEntry ? (
            <EmptyState
              className="px-4 py-6"
              title="Nenhum sábado carregado"
              description="Gere a agenda anual para começar a acompanhar a cobertura da base."
            />
          ) : null}

          {!isLoading && !combinedError && nextSaturdayEntry ? (
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(230px,0.8fr)]">
                <div className="min-w-0 rounded-[8px] border border-border/70 bg-background px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 font-medium text-foreground">
                      {nextSaturdayDateLabel}
                    </span>
                    <span>{nextSaturdayMeetingTime}</span>
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
                      <h3 className="text-lg font-semibold text-foreground md:text-xl">
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
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${highlightStyle.wrapperClass}`}
                    >
                      <HighlightIcon className="size-5" />
                    </div>
                  </div>

                  {!nextSaturdayEntry.assignment &&
                  !nextSaturdayEntry.event.blocksAssignments ? (
                    <div className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      Ainda falta definir orador e tema para esta data.
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1">
                  <div className="rounded-[8px] border border-border/70 bg-background px-3 py-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Congregação
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-foreground">
                      {nextSaturdayCongregation}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-border/70 bg-background px-3 py-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Tema
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-foreground">
                      {nextSaturdayTheme}
                    </p>
                  </div>
                </div>

                <div className="rounded-[8px] border border-border/70 bg-background p-3 lg:col-span-2 xl:col-span-1">
                  {nextSaturdayEntry.assignment ? (
                    <>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Contato rápido
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {nextSpeakerEmail ? (
                          <a
                            className={quickActionClass}
                            href={`mailto:${nextSpeakerEmail}`}
                          >
                            <Mail className="size-3.5" />
                            E-mail
                          </a>
                        ) : null}
                        {nextSpeakerPhoneLink ? (
                          <a className={quickActionClass} href={nextSpeakerPhoneLink}>
                            <Phone className="size-3.5" />
                            Telefone
                          </a>
                        ) : null}
                        {!nextSpeakerEmail && !nextSpeakerPhoneLink ? (
                          <p className="text-sm text-muted-foreground">
                            Sem contato rápido disponível.
                          </p>
                        ) : null}
                      </div>
                      {nextSpeakerQuery.isLoading ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Carregando contato do orador...
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex h-full flex-col justify-between gap-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Ação prioritária
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {nextSaturdayEntry.event.blocksAssignments
                          ? 'Nenhuma cobertura é necessária para esta data.'
                          : 'Priorize a escolha do orador e do tema para fechar a agenda desta semana.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {remainingSaturdayEntries.length > 0 ? (
                <div className="border-t border-border/70 pt-3">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {remainingSaturdayEntries.map((entry) => {
                      const entryStatus = getEntryStatus(entry)

                      return (
                        <div
                          key={entry.event.id}
                          className="rounded-[8px] border border-border/70 bg-card px-3 py-2.5"
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
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-muted/50 text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
