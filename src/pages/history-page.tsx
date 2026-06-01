import {
  CalendarDays,
  Church,
  ChevronDown,
  Filter,
  History,
  Mic2,
  RotateCcw,
  UsersRound,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { useAssignmentHistoryInfiniteQuery } from '@/hooks/use-assignments'
import { useCongregationsManagementQuery } from '@/hooks/use-congregations'
import { useSpeakersManagementQuery } from '@/hooks/use-speakers'
import { useThemesManagementQuery } from '@/hooks/use-themes'
import type {
  AssignmentDocument,
  AssignmentStatus,
  CongregationDocument,
  FirestoreRecord,
} from '@/types/firestore'
import {
  getAssignmentMovementLabel,
  inferAssignmentMovementType,
} from '@/utils/assignment-history'
import { assignmentStatusLabels, formatTimestampDate } from '@/utils/calendar-events'

const currentYear = new Date().getFullYear()
const historyPageSize = 40

const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70'

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

type TimelineSection = {
  id: string
  label: string
  assignments: Array<FirestoreRecord<AssignmentDocument>>
}

type PeriodFilterState = {
  periodStart: string
  periodEnd: string
}

function getDefaultPeriodState(): PeriodFilterState {
  return {
    periodStart: `${currentYear}-01-01`,
    periodEnd: `${currentYear}-12-31`,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar o historico permanente.'
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

function getMovementClassName(movementLabel: string) {
  if (movementLabel === 'Designacao local') {
    return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-200'
  }

  if (movementLabel === 'Entrada de visitante') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200'
  }

  return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200'
}

function formatPeriodBoundary(value: string) {
  return value.split('-').reverse().join('/')
}

function buildPeriodSummary(periodStart: string, periodEnd: string) {
  if (!periodStart && !periodEnd) {
    return 'Todo o historico'
  }

  if (periodStart && periodEnd) {
    return `${formatPeriodBoundary(periodStart)} a ${formatPeriodBoundary(periodEnd)}`
  }

  if (periodStart) {
    return `A partir de ${formatPeriodBoundary(periodStart)}`
  }

  return `Ate ${formatPeriodBoundary(periodEnd)}`
}

function buildTimelineSections(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
): TimelineSection[] {
  const sections = new Map<string, TimelineSection>()

  assignments.forEach((assignment) => {
    const eventDate = assignment.eventDate.toDate()
    const sectionId = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`
    const existingSection = sections.get(sectionId)

    if (existingSection) {
      existingSection.assignments.push(assignment)
      return
    }

    const formattedLabel = monthYearFormatter.format(eventDate)

    sections.set(sectionId, {
      id: sectionId,
      label: formattedLabel.charAt(0).toUpperCase() + formattedLabel.slice(1),
      assignments: [assignment],
    })
  })

  return Array.from(sections.values())
}

function getDistinctCongregationCount(
  assignments: Array<FirestoreRecord<AssignmentDocument>>,
) {
  return new Set(
    assignments.flatMap((assignment) => [
      assignment.localCongregationId,
      assignment.originCongregationId,
    ]),
  ).size
}

export function HistoryPage() {
  const [draftPeriod, setDraftPeriod] = useState<PeriodFilterState>(() =>
    getDefaultPeriodState(),
  )
  const [appliedPeriod, setAppliedPeriod] = useState<PeriodFilterState>(() =>
    getDefaultPeriodState(),
  )
  const [speakerFilter, setSpeakerFilter] = useState('all')
  const [themeFilter, setThemeFilter] = useState('all')
  const [congregationFilter, setCongregationFilter] = useState('all')
  const [periodFeedback, setPeriodFeedback] = useState<string | null>(null)

  const historyQuery = useAssignmentHistoryInfiniteQuery(
    {
      periodStart: appliedPeriod.periodStart || null,
      periodEnd: appliedPeriod.periodEnd || null,
    },
    historyPageSize,
  )
  const congregationsQuery = useCongregationsManagementQuery()
  const speakersQuery = useSpeakersManagementQuery()
  const themesQuery = useThemesManagementQuery()

  const filterOptionsError =
    congregationsQuery.error ?? speakersQuery.error ?? themesQuery.error ?? null

  const speakerOptions = useMemo(
    () =>
      (speakersQuery.data ?? []).map((speaker) => ({
        value: speaker.id,
        label: speaker.isActive ? speaker.name : `${speaker.name} (inativo)`,
      })),
    [speakersQuery.data],
  )

  const themeOptions = useMemo(
    () =>
      (themesQuery.data ?? []).map((theme) => ({
        value: theme.id,
        label: `${theme.number} - ${theme.title}${theme.isActive ? '' : ' (inativo)'}`,
      })),
    [themesQuery.data],
  )

  const congregationOptions = useMemo(
    () =>
      (congregationsQuery.data ?? []).map((congregation) => ({
        value: congregation.id,
        label: congregation.isActive
          ? congregation.name
          : `${congregation.name} (inativa)`,
      })),
    [congregationsQuery.data],
  )

  const congregationsById = useMemo(
    () =>
      new Map<string, FirestoreRecord<CongregationDocument>>(
        (congregationsQuery.data ?? []).map((congregation) => [
          congregation.id,
          congregation,
        ]),
      ),
    [congregationsQuery.data],
  )

  const loadedAssignments = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [historyQuery.data],
  )

  const filteredAssignments = useMemo(() => {
    return loadedAssignments.filter((assignment) => {
      if (speakerFilter !== 'all' && assignment.speakerId !== speakerFilter) {
        return false
      }

      if (themeFilter !== 'all' && assignment.themeId !== themeFilter) {
        return false
      }

      if (
        congregationFilter !== 'all' &&
        assignment.localCongregationId !== congregationFilter &&
        assignment.originCongregationId !== congregationFilter
      ) {
        return false
      }

      return true
    })
  }, [congregationFilter, loadedAssignments, speakerFilter, themeFilter])

  const timelineSections = useMemo(
    () => buildTimelineSections(filteredAssignments),
    [filteredAssignments],
  )

  const metrics = useMemo(() => {
    const confirmedCount = filteredAssignments.filter(
      (assignment) => assignment.status === 'confirmed',
    ).length
    const pendingCount = filteredAssignments.filter(
      (assignment) => assignment.status === 'pending',
    ).length

    return {
      total: filteredAssignments.length,
      confirmed: confirmedCount,
      pending: pendingCount,
      congregations: getDistinctCongregationCount(filteredAssignments),
    }
  }, [filteredAssignments])

  function handleApplyPeriod() {
    if (
      draftPeriod.periodStart &&
      draftPeriod.periodEnd &&
      draftPeriod.periodStart > draftPeriod.periodEnd
    ) {
      setPeriodFeedback('O periodo inicial nao pode ficar depois do periodo final.')
      return
    }

    setPeriodFeedback(null)
    setAppliedPeriod(draftPeriod)
  }

  function handleResetLocalFilters() {
    setSpeakerFilter('all')
    setThemeFilter('all')
    setCongregationFilter('all')
  }

  function handleCurrentYearShortcut() {
    const nextPeriod = getDefaultPeriodState()

    setPeriodFeedback(null)
    setDraftPeriod(nextPeriod)
    setAppliedPeriod(nextPeriod)
  }

  function handleAllHistoryShortcut() {
    const nextPeriod = {
      periodStart: '',
      periodEnd: '',
    }

    setPeriodFeedback(null)
    setDraftPeriod(nextPeriod)
    setAppliedPeriod(nextPeriod)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit bg-primary/10 text-primary">FASE 10 concluida</Badge>
            <div>
              <CardTitle className="text-3xl">Historico permanente</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                A tela agora consulta `assignments` por periodo, aplica filtros
                por tema, orador e congregacao sem colecao paralela e carrega o
                historico progressivamente para preservar custo e fluidez.
              </CardDescription>
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground lg:max-w-sm">
            <p className="font-medium text-foreground">Consulta atual</p>
            <p className="mt-2">{buildPeriodSummary(appliedPeriod.periodStart, appliedPeriod.periodEnd)}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
              {loadedAssignments.length} registros carregados em lotes de {historyPageSize}
            </p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="size-5 text-primary" />
            <CardTitle className="text-2xl">Filtros de consulta</CardTitle>
          </div>
          <CardDescription>
            O periodo controla a leitura no Firestore. Os demais filtros refinam
            localmente os registros ja carregados para manter o historico util
            sem desperdiçar leituras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {historyQuery.isError ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(historyQuery.error)}
            </div>
          ) : null}

          {filterOptionsError ? (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              {getErrorMessage(filterOptionsError)}
            </div>
          ) : null}

          {periodFeedback ? (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              {periodFeedback}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Orador</span>
              <select
                className={selectClassName}
                value={speakerFilter}
                onChange={(event) => setSpeakerFilter(event.target.value)}
                disabled={speakersQuery.isLoading}
              >
                <option value="all">Todos os oradores</option>
                {speakerOptions.map((speaker) => (
                  <option key={speaker.value} value={speaker.value}>
                    {speaker.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Tema</span>
              <select
                className={selectClassName}
                value={themeFilter}
                onChange={(event) => setThemeFilter(event.target.value)}
                disabled={themesQuery.isLoading}
              >
                <option value="all">Todos os temas</option>
                {themeOptions.map((theme) => (
                  <option key={theme.value} value={theme.value}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Congregacao</span>
              <select
                className={selectClassName}
                value={congregationFilter}
                onChange={(event) => setCongregationFilter(event.target.value)}
                disabled={congregationsQuery.isLoading}
              >
                <option value="all">Origem ou destino</option>
                {congregationOptions.map((congregation) => (
                  <option key={congregation.value} value={congregation.value}>
                    {congregation.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Periodo inicial</span>
              <Input
                type="date"
                value={draftPeriod.periodStart}
                onChange={(event) =>
                  setDraftPeriod((currentValue) => ({
                    ...currentValue,
                    periodStart: event.target.value,
                  }))
                }
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Periodo final</span>
              <Input
                type="date"
                value={draftPeriod.periodEnd}
                onChange={(event) =>
                  setDraftPeriod((currentValue) => ({
                    ...currentValue,
                    periodEnd: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCurrentYearShortcut}>
                <CalendarDays className="size-4" />
                Ano atual
              </Button>
              <Button variant="outline" size="sm" onClick={handleAllHistoryShortcut}>
                <History className="size-4" />
                Todo historico
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetLocalFilters}>
                <RotateCcw className="size-4" />
                Limpar filtros locais
              </Button>
            </div>

            <Button size="lg" onClick={handleApplyPeriod}>
              Aplicar periodo
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <History className="size-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Registros carregados</p>
                <p className="text-3xl font-semibold text-foreground">{metrics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UsersRound className="size-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmados carregados</p>
                <p className="text-3xl font-semibold text-foreground">
                  {metrics.confirmed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes carregados</p>
                <p className="text-3xl font-semibold text-foreground">{metrics.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Church className="size-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Congregacoes carregadas</p>
                <p className="text-3xl font-semibold text-foreground">
                  {metrics.congregations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Linha do tempo</CardTitle>
          <CardDescription>
            A consulta atual cobre {buildPeriodSummary(appliedPeriod.periodStart, appliedPeriod.periodEnd)} com carregamento progressivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {historyQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-[22px] border border-border/70 bg-background"
                />
              ))}
            </div>
          ) : null}

          {!historyQuery.isLoading &&
          !historyQuery.isError &&
          loadedAssignments.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-10 text-sm leading-6 text-muted-foreground">
              Nenhuma designacao foi encontrada para o periodo consultado.
            </div>
          ) : null}

          {!historyQuery.isLoading &&
          !historyQuery.isError &&
          loadedAssignments.length > 0 &&
          filteredAssignments.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-10 text-sm leading-6 text-muted-foreground">
              O periodo possui registros carregados, mas nenhum deles atende aos
              filtros de orador, tema e congregacao aplicados agora.
            </div>
          ) : null}

          {!historyQuery.isLoading &&
          !historyQuery.isError &&
          timelineSections.length > 0 ? (
            <div className="space-y-6">
              {timelineSections.map((section) => (
                <section key={section.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/70" />
                    <Badge className="bg-background text-foreground">{section.label}</Badge>
                    <div className="h-px flex-1 bg-border/70" />
                  </div>

                  <div className="grid gap-4">
                    {section.assignments.map((assignment) => {
                      const movementLabel = getAssignmentMovementLabel(
                        inferAssignmentMovementType(assignment, congregationsById),
                      )

                      return (
                        <article
                          key={assignment.id}
                          className="rounded-[22px] border border-border/70 bg-background px-5 py-5"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={getStatusClassName(assignment.status)}>
                                  {assignmentStatusLabels[assignment.status]}
                                </Badge>
                                <Badge className={getMovementClassName(movementLabel)}>
                                  {movementLabel}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatTimestampDate(assignment.eventDate)}
                                </span>
                              </div>

                              <div>
                                <p className="text-lg font-semibold text-foreground">
                                  {assignment.themeNumber} - {assignment.themeTitle}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {assignment.speakerName} • {assignment.originCongregationName}
                                </p>
                              </div>
                            </div>

                            <div className="grid gap-2 text-sm text-muted-foreground lg:min-w-[250px]">
                              <div className="flex items-center gap-2">
                                <Church className="size-4 text-primary" />
                                <span>
                                  {assignment.originCongregationName} para{' '}
                                  {assignment.localCongregationName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mic2 className="size-4 text-primary" />
                                <span>
                                  Tema {assignment.themeNumber} •{' '}
                                  {assignment.speakerType === 'visitor'
                                    ? 'Visitante'
                                    : 'Local'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="size-4 text-primary" />
                                <span>
                                  Atualizado em{' '}
                                  {dateTimeFormatter.format(assignment.updatedAt.toDate())}
                                </span>
                              </div>
                            </div>
                          </div>

                          {assignment.notes ? (
                            <div className="mt-4 rounded-[18px] border border-border/70 bg-secondary/45 px-4 py-3 text-sm leading-6 text-muted-foreground">
                              {assignment.notes}
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}

              {historyQuery.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => void historyQuery.fetchNextPage()}
                    disabled={historyQuery.isFetchingNextPage}
                  >
                    <ChevronDown className="size-4" />
                    {historyQuery.isFetchingNextPage
                      ? 'Carregando mais registros...'
                      : `Carregar mais ${historyPageSize} registros`}
                  </Button>
                </div>
              ) : loadedAssignments.length > 0 ? (
                <div className="rounded-[18px] border border-dashed border-border/80 bg-background px-4 py-4 text-center text-sm text-muted-foreground">
                  Todos os registros disponiveis para este filtro ja foram carregados.
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
