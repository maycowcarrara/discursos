import {
  CalendarDays,
  Church,
  ChevronDown,
  Filter,
  History,
  RotateCcw,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/app/empty-state'
import { EntityPageShell } from '@/components/app/entity-page-shell'
import { MetadataChip } from '@/components/app/metadata-chip'
import { MetricStrip } from '@/components/app/metric-strip'
import { PageHeader } from '@/components/app/page-header'
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
import {
  useAssignmentHistoryInfiniteQuery,
  useAssignmentHistoryQuery,
} from '@/hooks/use-assignments'
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
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70'

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

  return 'Não foi possível carregar o histórico permanente.'
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
  if (movementLabel === 'Designação local') {
    return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-200'
  }

  if (movementLabel === 'Orador visitante') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200'
  }

  return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200'
}

function formatPeriodBoundary(value: string) {
  return value.split('-').reverse().join('/')
}

function buildPeriodSummary(periodStart: string, periodEnd: string) {
  if (!periodStart && !periodEnd) {
    return 'Todo o histórico'
  }

  if (periodStart && periodEnd) {
    return `${formatPeriodBoundary(periodStart)} a ${formatPeriodBoundary(periodEnd)}`
  }

  if (periodStart) {
    return `A partir de ${formatPeriodBoundary(periodStart)}`
  }

  return `Até ${formatPeriodBoundary(periodEnd)}`
}

function buildResultSummary(loadedCount: number, filteredCount: number) {
  if (loadedCount === 0) {
    return 'Nenhum registro carregado'
  }

  if (filteredCount === 0) {
    return 'Nenhum item com os filtros atuais'
  }

  if (filteredCount !== loadedCount) {
    return `${filteredCount} item(ns) após os filtros`
  }

  return `${loadedCount} registro(s) carregado(s)`
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [periodFeedback, setPeriodFeedback] = useState<string | null>(null)
  const hasLocalFilters =
    speakerFilter !== 'all' ||
    themeFilter !== 'all' ||
    congregationFilter !== 'all'

  const historyQuery = useAssignmentHistoryInfiniteQuery(
    {
      periodStart: appliedPeriod.periodStart || null,
      periodEnd: appliedPeriod.periodEnd || null,
    },
    historyPageSize,
    !hasLocalFilters,
  )
  const fullHistoryQuery = useAssignmentHistoryQuery(
    {
      periodStart: appliedPeriod.periodStart || null,
      periodEnd: appliedPeriod.periodEnd || null,
    },
    hasLocalFilters,
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
    () =>
      hasLocalFilters
        ? fullHistoryQuery.data ?? []
        : historyQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [fullHistoryQuery.data, hasLocalFilters, historyQuery.data],
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

  const shouldShowFilterPanel =
    isFiltersOpen ||
    historyQuery.isError ||
    fullHistoryQuery.isError ||
    Boolean(filterOptionsError) ||
    Boolean(periodFeedback)
  const historyIsLoading = hasLocalFilters
    ? fullHistoryQuery.isLoading
    : historyQuery.isLoading
  const historyIsError = hasLocalFilters
    ? fullHistoryQuery.isError
    : historyQuery.isError
  const historyError = hasLocalFilters ? fullHistoryQuery.error : historyQuery.error

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
    <EntityPageShell>
      <PageHeader
        eyebrow="Histórico"
        title="Histórico de designações"
        description="Revise períodos anteriores, encontre temas já usados e acompanhe a movimentação de oradores com filtros simples."
        meta={
          <>
            <Badge className="bg-primary/10 text-primary">
              {buildPeriodSummary(appliedPeriod.periodStart, appliedPeriod.periodEnd)}
            </Badge>
            <Badge variant="outline">
              {buildResultSummary(loadedAssignments.length, metrics.total)}
            </Badge>
          </>
        }
      />

      <MetricStrip
        items={[
          {
            label: 'Registros',
            value: String(metrics.total),
            detail: buildResultSummary(loadedAssignments.length, metrics.total),
            icon: History,
            tone: 'blue',
          },
          {
            label: 'Confirmados',
            value: String(metrics.confirmed),
            detail: 'No filtro atual',
            icon: UsersRound,
            tone: 'green',
          },
          {
            label: 'Pendentes',
            value: String(metrics.pending),
            detail: 'Aguardando retorno',
            icon: CalendarDays,
            tone: 'amber',
          },
          {
            label: 'Congregações',
            value: String(metrics.congregations),
            detail: 'Origem ou destino',
            icon: Church,
            tone: 'slate',
          },
        ]}
      />

      <Card className="overflow-hidden rounded-lg">
        <CardHeader className="gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Filter className="size-5 text-primary" />
                <CardTitle className="text-xl">Filtros</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Escolha o período principal e refine por orador, tema ou congregação.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
            >
              <ChevronDown
                className={`size-4 transition-transform ${shouldShowFilterPanel ? 'rotate-180' : ''}`}
              />
              {shouldShowFilterPanel ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
          </div>
          {!shouldShowFilterPanel ? (
            <div className="flex flex-wrap gap-2">
              <MetadataChip
                label="Período"
                value={buildPeriodSummary(
                  appliedPeriod.periodStart,
                  appliedPeriod.periodEnd,
                )}
              />
              <MetadataChip label="Orador" value={speakerFilter === 'all' ? 'Todos' : 'Filtrado'} />
              <MetadataChip label="Tema" value={themeFilter === 'all' ? 'Todos' : 'Filtrado'} />
              <MetadataChip
                label="Congregação"
                value={congregationFilter === 'all' ? 'Todas' : 'Filtrada'}
              />
            </div>
          ) : null}
        </CardHeader>
        {shouldShowFilterPanel ? (
          <CardContent className="space-y-5 p-4 pt-0">
            {historyIsError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {getErrorMessage(historyError)}
              </div>
            ) : null}

            {filterOptionsError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {getErrorMessage(filterOptionsError)}
              </div>
            ) : null}

            {periodFeedback ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
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
                <span className="text-sm font-medium text-foreground">Congregação</span>
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
                <span className="text-sm font-medium text-foreground">Período inicial</span>
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
                <span className="text-sm font-medium text-foreground">Período final</span>
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
                  Todo histórico
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetLocalFilters}>
                  <RotateCcw className="size-4" />
                  Limpar filtros locais
                </Button>
              </div>

              <Button size="lg" onClick={handleApplyPeriod}>
                Aplicar período
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card className="overflow-hidden rounded-lg">
        <CardHeader className="p-4">
          <CardTitle className="text-xl">Linha do tempo</CardTitle>
          <CardDescription>
            A consulta atual cobre {buildPeriodSummary(appliedPeriod.periodStart, appliedPeriod.periodEnd)}
            {hasLocalFilters
              ? ' e carrega todo o período para aplicar os filtros.'
              : ' com carregamento progressivo.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          {historyIsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-xl border border-border bg-background"
                />
              ))}
            </div>
          ) : null}

          {!historyIsLoading &&
          !historyIsError &&
          loadedAssignments.length === 0 ? (
            <EmptyState
              title="Nenhuma designação encontrada"
              description="Não houve resultados para o período consultado."
            />
          ) : null}

          {!historyIsLoading &&
          !historyIsError &&
          loadedAssignments.length > 0 &&
          filteredAssignments.length === 0 ? (
            <EmptyState
              title="Nenhum registro com os filtros atuais"
              description="O período possui registros, mas nenhum atende aos filtros de orador, tema e congregação."
            />
          ) : null}

          {!historyIsLoading &&
          !historyIsError &&
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
                          className="rounded-lg border border-border bg-background px-3 py-3"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-2">
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
                                <p className="text-base font-semibold leading-tight text-foreground">
                                  {assignment.themeNumber} - {assignment.themeTitle}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {assignment.speakerName} • {assignment.originCongregationName}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 lg:max-w-[420px] lg:justify-end">
                              <MetadataChip
                                label="Destino"
                                value={assignment.localCongregationName}
                              />
                              <MetadataChip
                                label="Tipo"
                                value={assignment.speakerType === 'visitor' ? 'Visitante' : 'Local'}
                              />
                              <MetadataChip
                                label="Atualizado"
                                value={dateTimeFormatter.format(assignment.updatedAt.toDate())}
                              />
                            </div>
                          </div>

                          {assignment.notes ? (
                            <div className="mt-3 border-l-2 border-border py-0.5 pl-3 text-sm leading-6 text-muted-foreground">
                              {assignment.notes}
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}

              {!hasLocalFilters && historyQuery.hasNextPage ? (
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
                <div className="rounded-xl border border-dashed border-border bg-background px-4 py-3 text-center text-sm text-muted-foreground">
                  {hasLocalFilters
                    ? 'Todos os registros do período foram considerados pelos filtros.'
                    : 'Todos os registros disponíveis para este período já foram carregados.'}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </EntityPageShell>
  )
}
