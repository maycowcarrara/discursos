import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'

import { MetricCard } from '@/components/app/metric-card'
import { StatusPill } from '@/components/app/status-pill'
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useAssignmentsByYearQuery } from '@/hooks/use-assignments'
import { useCalendarEventsQuery } from '@/hooks/use-calendar-events'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  assignmentStatusLabels,
  calendarEventTypeLabels,
  formatTimestampDate,
} from '@/utils/calendar-events'
import {
  buildDashboardPendingItems,
  buildDashboardSaturdayEntries,
  countRemainingSaturdaySlots,
  listUpcomingSpecialEvents,
} from '@/utils/dashboard'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar o dashboard agora.'
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatMonthBadge(date: Date) {
  return date
    .toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    })
    .replace('.', '')
    .toUpperCase()
}

function getHighlightStyle(
  status: 'confirmed' | 'pending' | 'event',
) {
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

export function DashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentYear = today.getFullYear()
  const shouldLoadNextYear = countRemainingSaturdaySlots(today) < 8

  const appSettingsQuery = useAppSettingsQuery()
  const congregationsQuery = useCongregationsQuery()
  const calendarEventsCurrentYearQuery = useCalendarEventsQuery(currentYear)
  const assignmentsCurrentYearQuery = useAssignmentsByYearQuery(currentYear)
  const calendarEventsNextYearQuery = useCalendarEventsQuery(
    currentYear + 1,
    shouldLoadNextYear,
  )
  const assignmentsNextYearQuery = useAssignmentsByYearQuery(
    currentYear + 1,
    shouldLoadNextYear,
  )

  const calendarEvents = [
    ...(calendarEventsCurrentYearQuery.data ?? []),
    ...(shouldLoadNextYear ? calendarEventsNextYearQuery.data ?? [] : []),
  ].sort((left, right) => left.date.toMillis() - right.date.toMillis())
  const assignments = [
    ...(assignmentsCurrentYearQuery.data ?? []),
    ...(shouldLoadNextYear ? assignmentsNextYearQuery.data ?? [] : []),
  ].sort((left, right) => left.eventDate.toMillis() - right.eventDate.toMillis())
  const localCongregation =
    congregationsQuery.data?.find((congregation) => congregation.isLocal) ?? null
  const organizationName =
    appSettingsQuery.data?.organizationName.trim() || localCongregation?.name || 'Agenda local'
  const upcomingSaturdayEntries = buildDashboardSaturdayEntries(
    calendarEvents,
    assignments,
    today,
  )
  const pendingItems = buildDashboardPendingItems(upcomingSaturdayEntries)
  const upcomingSpecialEvents = listUpcomingSpecialEvents(
    calendarEvents,
    assignments,
    today,
  )
  const unassignedItems = pendingItems.filter((item) => item.kind === 'unassigned')
  const awaitingResponseItems = pendingItems.filter(
    (item) => item.kind === 'awaitingResponse',
  )
  const nextSaturdayEntry = upcomingSaturdayEntries[0] ?? null
  const nextSpecialEvent = upcomingSpecialEvents[0] ?? null
  const nextPendingItem = pendingItems[0] ?? null
  const nextUnassignedItem = unassignedItems[0] ?? null
  const nextAwaitingResponseItem = awaitingResponseItems[0] ?? null

  const combinedError =
    appSettingsQuery.error ??
    congregationsQuery.error ??
    calendarEventsCurrentYearQuery.error ??
    assignmentsCurrentYearQuery.error ??
    (shouldLoadNextYear ? calendarEventsNextYearQuery.error : null) ??
    (shouldLoadNextYear ? assignmentsNextYearQuery.error : null)

  const isLoading =
    appSettingsQuery.isLoading ||
    congregationsQuery.isLoading ||
    calendarEventsCurrentYearQuery.isLoading ||
    assignmentsCurrentYearQuery.isLoading ||
    (shouldLoadNextYear &&
      (calendarEventsNextYearQuery.isLoading || assignmentsNextYearQuery.isLoading))

  const nextSaturdayStatus: 'confirmed' | 'pending' | 'event' = nextSaturdayEntry
    ? nextSaturdayEntry.event.blocksAssignments
      ? 'event'
      : nextSaturdayEntry.assignment?.status === 'confirmed'
        ? 'confirmed'
        : 'pending'
    : 'pending'
  const highlightStyle = getHighlightStyle(nextSaturdayStatus)
  const HighlightIcon = highlightStyle.Icon
  const metrics = [
    {
      label: 'Pendencias',
      value: String(pendingItems.length),
      detail: nextPendingItem
        ? `${formatShortDate(nextPendingItem.event.date.toDate())} exige acao imediata.`
        : 'Nenhuma pendencia nos proximos 8 sabados.',
      tone: pendingItems.length > 0 ? 'amber' : 'green',
      icon: TriangleAlert,
    },
    {
      label: 'Sem designacao',
      value: String(unassignedItems.length),
      detail: nextUnassignedItem
        ? `${formatShortDate(nextUnassignedItem.event.date.toDate())} ainda sem orador definido.`
        : 'Todos os sabados livres da janela estao cobertos.',
      tone: unassignedItems.length > 0 ? 'amber' : 'green',
      icon: CalendarDays,
    },
    {
      label: 'Aguardando resposta',
      value: String(awaitingResponseItems.length),
      detail:
        nextAwaitingResponseItem && nextAwaitingResponseItem.assignment
          ? `${nextAwaitingResponseItem.assignment.speakerName} ainda nao confirmou.`
          : 'Nenhuma confirmacao pendente na janela atual.',
      tone: awaitingResponseItems.length > 0 ? 'blue' : 'green',
      icon: Clock3,
    },
    {
      label: 'Eventos especiais',
      value: String(upcomingSpecialEvents.length),
      detail: nextSpecialEvent
        ? `${calendarEventTypeLabels[nextSpecialEvent.event.type]} em ${formatShortDate(
            nextSpecialEvent.event.date.toDate(),
          )}.`
        : 'Nenhum evento especial futuro carregado.',
      tone: upcomingSpecialEvents.length > 0 ? 'blue' : 'green',
      icon: Sparkles,
    },
  ] as const

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-3xl">Dashboard</CardTitle>
                <CardDescription className="mt-1 text-base">
                  Panorama operacional real da agenda local com foco nos
                  proximos 8 sabados.
                </CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary">Painel operacional</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[22px] border border-border/70 bg-background p-5">
              <p className="text-sm font-medium text-muted-foreground">Base local</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {organizationName}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {localCongregation
                  ? `${localCongregation.address} - ${localCongregation.city}/${localCongregation.state}`
                  : 'Cadastre uma congregacao com `isLocal = true` para destacar a base principal do painel.'}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-border/70 bg-card px-4 py-4">
                  <p className="text-sm text-muted-foreground">Reuniao publica</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <CalendarDays className="size-4 text-primary" />
                    {localCongregation?.meetingDay ?? 'Dia nao definido'}
                  </p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <Clock3 className="size-4 text-primary" />
                    {localCongregation?.meetingTime ?? 'Horario nao definido'}
                  </p>
                </div>
                <div className="rounded-[18px] border border-border/70 bg-card px-4 py-4">
                  <p className="text-sm text-muted-foreground">Configuracao base</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    Ano {appSettingsQuery.data?.defaultYear ?? currentYear}
                  </p>
                  <p className="mt-2 text-sm text-primary">
                    {appSettingsQuery.data?.timezone ?? 'America/Sao_Paulo'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background p-5">
              <p className="text-sm font-medium text-muted-foreground">
                Proximo sabado
              </p>
              {isLoading ? (
                <div className="mt-5 flex min-h-52 items-center justify-center rounded-[22px] border border-dashed border-border/80 bg-card">
                  <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : null}

              {!isLoading && combinedError ? (
                <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {getErrorMessage(combinedError)}
                </div>
              ) : null}

              {!isLoading && !combinedError && !nextSaturdayEntry ? (
                <div className="mt-5 rounded-[20px] border border-dashed border-border/80 bg-card px-4 py-5 text-sm leading-6 text-muted-foreground">
                  Nenhum sabado futuro foi encontrado em `calendarEvents`. Gere
                  a agenda anual na Fase 7 para liberar o painel operacional.
                </div>
              ) : null}

              {!isLoading && !combinedError && nextSaturdayEntry ? (
                <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="w-full max-w-[128px] rounded-[22px] border border-primary/20 bg-primary/5 px-4 py-5 text-center">
                    <p className="text-4xl font-semibold tracking-tight text-primary">
                      {nextSaturdayEntry.event.date
                        .toDate()
                        .toLocaleDateString('pt-BR', { day: '2-digit' })}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {formatMonthBadge(nextSaturdayEntry.event.date.toDate())}
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {formatLongDate(nextSaturdayEntry.event.date.toDate())}
                    </p>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-2xl font-semibold text-foreground">
                        {nextSaturdayEntry.assignment
                          ? nextSaturdayEntry.assignment.speakerName
                          : nextSaturdayEntry.event.blocksAssignments
                            ? nextSaturdayEntry.event.title
                            : 'Sem designacao'}
                      </p>
                      <StatusPill status={nextSaturdayStatus}>
                        {nextSaturdayEntry.event.blocksAssignments
                          ? calendarEventTypeLabels[nextSaturdayEntry.event.type]
                          : nextSaturdayEntry.assignment
                            ? assignmentStatusLabels[nextSaturdayEntry.assignment.status]
                            : 'Sem designacao'}
                      </StatusPill>
                      {nextSaturdayEntry.assignment ? (
                        <StatusPill status={nextSaturdayEntry.assignment.speakerType}>
                          {nextSaturdayEntry.assignment.speakerType === 'local'
                            ? 'Local'
                            : 'Visitante'}
                        </StatusPill>
                      ) : null}
                    </div>
                    <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Evento:</span>{' '}
                        {nextSaturdayEntry.event.title}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Tipo:</span>{' '}
                        {calendarEventTypeLabels[nextSaturdayEntry.event.type]}
                      </p>
                      {nextSaturdayEntry.assignment ? (
                        <>
                          <p>
                            <span className="font-medium text-foreground">Congregacao:</span>{' '}
                            {nextSaturdayEntry.assignment.originCongregationName}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Tema:</span>{' '}
                            {`${nextSaturdayEntry.assignment.themeNumber} - ${nextSaturdayEntry.assignment.themeTitle}`}
                          </p>
                        </>
                      ) : null}
                      {!nextSaturdayEntry.assignment &&
                      !nextSaturdayEntry.event.blocksAssignments ? (
                        <p className="text-amber-700 dark:text-amber-200">
                          Cadastre orador e tema para cobrir este sabado.
                        </p>
                      ) : null}
                      {nextSaturdayEntry.event.description ? (
                        <p>{nextSaturdayEntry.event.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-full ${highlightStyle.wrapperClass}`}
                  >
                    <HighlightIcon className="size-7" />
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            tone={metric.tone}
            icon={metric.icon}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Proximos 8 sabados</CardTitle>
            <CardDescription>
              Leitura operacional direta de `calendarEvents` e `assignments`,
              sem depender de mocks nesta fase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[18px] border border-border/70 bg-background"
                />
              ))
            ) : null}

            {!isLoading && combinedError ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {getErrorMessage(combinedError)}
              </div>
            ) : null}

            {!isLoading && !combinedError && upcomingSaturdayEntries.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-border/80 bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
                Ainda nao ha sabados futuros carregados para esta janela.
              </div>
            ) : null}

            {!isLoading && !combinedError && upcomingSaturdayEntries.length > 0
              ? upcomingSaturdayEntries.map((entry) => {
                  const status: 'confirmed' | 'pending' | 'event' =
                    entry.event.blocksAssignments
                      ? 'event'
                      : entry.assignment?.status === 'confirmed'
                        ? 'confirmed'
                        : 'pending'

                  return (
                    <div
                      key={entry.event.id}
                      className="rounded-[18px] border border-border/70 bg-background px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground">
                              {formatLongDate(entry.event.date.toDate())}
                            </p>
                            <StatusPill status={status}>
                              {entry.event.blocksAssignments
                                ? calendarEventTypeLabels[entry.event.type]
                                : entry.assignment
                                  ? assignmentStatusLabels[entry.assignment.status]
                                  : 'Sem designacao'}
                            </StatusPill>
                            {entry.assignment ? (
                              <StatusPill status={entry.assignment.speakerType}>
                                {entry.assignment.speakerType === 'local'
                                  ? 'Local'
                                  : 'Visitante'}
                              </StatusPill>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {entry.event.title}
                          </p>
                          {entry.assignment ? (
                            <div className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
                              <p>
                                <span className="font-medium text-foreground">Orador:</span>{' '}
                                {entry.assignment.speakerName}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Origem:</span>{' '}
                                {entry.assignment.originCongregationName}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Tema:</span>{' '}
                                {`${entry.assignment.themeNumber} - ${entry.assignment.themeTitle}`}
                              </p>
                            </div>
                          ) : null}
                          {!entry.assignment && !entry.event.blocksAssignments ? (
                            <p className="mt-3 text-sm leading-6 text-amber-700 dark:text-amber-200">
                              Sem designacao operacional para este sabado.
                            </p>
                          ) : null}
                          {entry.event.description ? (
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                              {entry.event.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimestampDate(entry.event.date)}
                        </div>
                      </div>
                    </div>
                  )
                })
              : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Pendencias da janela</CardTitle>
            <CardDescription>
              Priorizacao automatica do que exige acao primeiro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-[18px] border border-border/70 bg-background"
                />
              ))
            ) : null}

            {!isLoading && combinedError ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {getErrorMessage(combinedError)}
              </div>
            ) : null}

            {!isLoading && !combinedError && pendingItems.length === 0 ? (
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm leading-6 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Nenhuma pendencia critica encontrada na janela dos proximos 8
                sabados.
              </div>
            ) : null}

            {!isLoading && !combinedError && pendingItems.length > 0
              ? pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[18px] border border-border/70 bg-background px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status="pending">
                        {item.kind === 'unassigned'
                          ? 'Sem designacao'
                          : 'Aguardando resposta'}
                      </StatusPill>
                      <p className="text-sm font-medium text-foreground">
                        {formatLongDate(item.event.date.toDate())}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.kind === 'unassigned'
                        ? `Defina orador e tema para ${item.event.title.toLowerCase()}.`
                        : `${item.assignment?.speakerName ?? 'O orador'} ainda nao confirmou ${item.event.title.toLowerCase()}.`}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.assignment
                        ? `${item.assignment.originCongregationName} • Tema ${item.assignment.themeNumber} - ${item.assignment.themeTitle}`
                        : calendarEventTypeLabels[item.event.type]}
                    </p>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Proximos eventos especiais</CardTitle>
            <CardDescription>
              Congressos, assembleias, visitas e eventos especiais ja visiveis
              na agenda futura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-[18px] border border-border/70 bg-background"
                />
              ))
            ) : null}

            {!isLoading && combinedError ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {getErrorMessage(combinedError)}
              </div>
            ) : null}

            {!isLoading && !combinedError && upcomingSpecialEvents.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-border/80 bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
                Nenhum evento especial futuro foi encontrado na agenda ativa.
              </div>
            ) : null}

            {!isLoading && !combinedError && upcomingSpecialEvents.length > 0
              ? upcomingSpecialEvents.slice(0, 4).map((entry) => (
                  <div
                    key={entry.event.id}
                    className="rounded-[18px] border border-border/70 bg-background px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status="event">
                            {calendarEventTypeLabels[entry.event.type]}
                          </StatusPill>
                          <p className="text-sm font-medium text-foreground">
                            {entry.event.title}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {entry.event.description ??
                            (entry.event.blocksAssignments
                              ? 'Bloqueia designacoes para esta data.'
                              : 'Evento especial sem bloqueio automatico de designacoes.')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>{formatLongDate(entry.event.date.toDate())}</span>
                          {entry.event.congregationName ? (
                            <span>{entry.event.congregationName}</span>
                          ) : null}
                          {entry.assignment ? (
                            <span>{`Cobertura: ${entry.assignment.speakerName}`}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <CalendarCheck2 className="size-4" />
                      </div>
                    </div>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
