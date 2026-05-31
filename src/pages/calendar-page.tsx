import { CalendarDays, ChevronLeft, ChevronRight, ShieldBan } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useAssignmentsByYearQuery } from '@/hooks/use-assignments'
import { useCalendarEventsQuery } from '@/hooks/use-calendar-events'
import {
  assignmentStatusLabels,
  buildAssignmentMapByCalendarEventId,
  calendarEventTypeLabels,
  formatCalendarDate,
  formatCalendarDay,
  groupCalendarEventsByMonth,
} from '@/utils/calendar-events'

const currentYear = new Date().getFullYear()

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar a agenda anual.'
}

function getEventBadgeClassName(
  eventType: string,
  blocksAssignments: boolean,
  hasAssignment: boolean,
) {
  if (blocksAssignments) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
  }

  if (eventType === 'publicTalk' && hasAssignment) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (eventType === 'visit') {
    return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200'
  }

  return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
}

function getAssignmentBadgeClassName(status: string) {
  if (status === 'confirmed') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (status === 'pending') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
  }

  if (status === 'declined' || status === 'cancelled' || status === 'replaced') {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
  }

  return 'bg-secondary text-secondary-foreground'
}

export function CalendarPage() {
  const appSettingsQuery = useAppSettingsQuery()
  const [selectedYearOverride, setSelectedYearOverride] = useState<number | null>(
    null,
  )

  const activeYear =
    selectedYearOverride ?? appSettingsQuery.data?.defaultYear ?? currentYear
  const calendarEventsQuery = useCalendarEventsQuery(activeYear)
  const assignmentsQuery = useAssignmentsByYearQuery(activeYear)

  const assignmentMap = useMemo(
    () => buildAssignmentMapByCalendarEventId(assignmentsQuery.data ?? []),
    [assignmentsQuery.data],
  )

  const monthlySections = useMemo(
    () => groupCalendarEventsByMonth(activeYear, calendarEventsQuery.data ?? []),
    [activeYear, calendarEventsQuery.data],
  )

  const stats = useMemo(() => {
    const events = calendarEventsQuery.data ?? []
    const total = events.length
    const blocked = events.filter((event) => event.blocksAssignments).length
    const publicTalks = events.filter((event) => event.type === 'publicTalk').length
    const assignedPublicTalks = events.filter(
      (event) =>
        event.type === 'publicTalk' && assignmentMap.has(event.id),
    ).length

    return {
      total,
      blocked,
      publicTalks,
      assignedPublicTalks,
    }
  }, [assignmentMap, calendarEventsQuery.data])

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-3xl">Planejamento anual</CardTitle>
            <CardDescription className="mt-2 text-base">
              Leitura real de `calendarEvents` com cruzamento leve em `assignments`
              para mostrar onde ja existe designacao.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Ano anterior"
              onClick={() => setSelectedYearOverride(activeYear - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="rounded-2xl border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground">
              {activeYear}
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Proximo ano"
              onClick={() => setSelectedYearOverride(activeYear + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedYearOverride(currentYear)}
            >
              Hoje
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Eventos no ano</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.total}
              </p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Bloqueios oficiais</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.blocked}
              </p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Discursos publicos</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.publicTalks}
              </p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Ja designados</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.assignedPublicTalks}
              </p>
            </div>
          </div>

          {calendarEventsQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(calendarEventsQuery.error)}
            </div>
          ) : null}

          {assignmentsQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(assignmentsQuery.error)}
            </div>
          ) : null}

          {calendarEventsQuery.isLoading || assignmentsQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-[22px] border border-border/70 bg-background"
                />
              ))}
            </div>
          ) : null}

          {!calendarEventsQuery.isLoading &&
          !calendarEventsQuery.isError &&
          calendarEventsQuery.data?.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
              Nenhum `calendarEvent` ativo encontrado para {activeYear}. A Fase 3 ja
              deixou a leitura pronta; a geracao anual entra na Fase 7.
            </div>
          ) : null}

          {!calendarEventsQuery.isLoading &&
          !calendarEventsQuery.isError &&
          calendarEventsQuery.data &&
          calendarEventsQuery.data.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              {monthlySections.map((month) => (
                <div
                  key={`${activeYear}-${month.monthIndex}`}
                  className="rounded-[22px] border border-border/70 bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">
                      {month.monthLabel} {activeYear}
                    </h3>
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CalendarDays className="size-4" />
                    </div>
                  </div>

                  {month.events.length === 0 ? (
                    <div className="mt-4 rounded-[18px] border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                      Sem eventos cadastrados.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {month.events.map((event) => {
                        const assignment = assignmentMap.get(event.id)

                        return (
                          <div
                            key={event.id}
                            className="rounded-[18px] border border-border/60 bg-card px-3 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {formatCalendarDay(event)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCalendarDate(event)}
                                </p>
                              </div>
                              <Badge
                                className={getEventBadgeClassName(
                                  event.type,
                                  event.blocksAssignments,
                                  Boolean(assignment),
                                )}
                              >
                                {calendarEventTypeLabels[event.type]}
                              </Badge>
                            </div>

                            <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                              {event.title}
                            </p>

                            {event.description ? (
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {event.description}
                              </p>
                            ) : null}

                            {event.blocksAssignments ? (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                                <ShieldBan className="size-3.5" />
                                Bloqueia designacoes
                              </div>
                            ) : null}

                            {assignment ? (
                              <div className="mt-3 space-y-2 rounded-[16px] border border-border/60 bg-background px-3 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className={getAssignmentBadgeClassName(
                                      assignment.status,
                                    )}
                                  >
                                    {assignmentStatusLabels[assignment.status]}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {assignment.speakerName}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground">
                                  Tema {assignment.themeNumber} -{' '}
                                  {assignment.themeTitle}
                                </p>
                              </div>
                            ) : event.type === 'publicTalk' ? (
                              <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                Sem designacao vinculada ainda.
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
