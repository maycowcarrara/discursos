import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  Plus,
  ShieldBan,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

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
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useAssignmentsByYearQuery } from '@/hooks/use-assignments'
import {
  useCalendarEventsManagementQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useGenerateCalendarYearMutation,
  useUpdateCalendarEventMutation,
} from '@/hooks/use-calendar-events'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import {
  calendarEventTypeSchema,
  type CalendarEventType,
} from '@/types/firestore'
import {
  buildAssignmentCountMapByCalendarEventId,
  assignmentStatusLabels,
  buildOperationalAssignmentMapByCalendarEventId,
  calendarEventDefaultTitles,
  calendarEventTypeLabels,
  findFirstAvailableSaturdayDate,
  formatCalendarDate,
  formatCalendarDay,
  getBlocksAssignmentsForEventType,
  groupCalendarEventsByMonth,
  listSaturdayDateValuesForYear,
  parseDateInputValue,
  toLocalDateKey,
} from '@/utils/calendar-events'
import {
  defaultCalendarEventFormValues,
  toCalendarEventFormValues,
  type CalendarEventFormValues,
} from '@/services/firestore/calendar-events-service'

const currentYear = new Date().getFullYear()
const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70'

const calendarEventFormSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data valida.')
    .refine(
      (value) => {
        try {
          parseDateInputValue(value)
          return true
        } catch {
          return false
        }
      },
      'Informe uma data valida.',
    ),
  type: calendarEventTypeSchema,
  title: z.string().trim().min(3, 'Informe um titulo claro para o evento.'),
  description: z.string().trim(),
  congregationId: z.string(),
  isActive: z.boolean(),
})

type FeedbackState =
  | {
      tone: 'success' | 'error'
      message: string
    }
  | null

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel concluir a operacao no calendario.'
}

function getFeedbackContainerClassName(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function getEventBadgeClassName(
  eventType: CalendarEventType,
  blocksAssignments: boolean,
  hasAssignment: boolean,
  isActive: boolean,
) {
  if (!isActive) {
    return 'bg-secondary text-secondary-foreground'
  }

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

function formatUpdatedAt(value: Date) {
  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function buildCreateModeFormValues(preferredDate: string): CalendarEventFormValues {
  return {
    ...defaultCalendarEventFormValues,
    date: preferredDate,
  }
}

export function CalendarPage() {
  const { user } = useAuth()
  const appSettingsQuery = useAppSettingsQuery()
  const [selectedYearOverride, setSelectedYearOverride] = useState<number | null>(
    null,
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const activeYear =
    selectedYearOverride ?? appSettingsQuery.data?.defaultYear ?? currentYear
  const calendarEventsQuery = useCalendarEventsManagementQuery(activeYear)
  const assignmentsQuery = useAssignmentsByYearQuery(activeYear)
  const congregationsQuery = useCongregationsQuery()

  const createCalendarEventMutation = useCreateCalendarEventMutation()
  const updateCalendarEventMutation = useUpdateCalendarEventMutation()
  const deleteCalendarEventMutation = useDeleteCalendarEventMutation()
  const generateCalendarYearMutation = useGenerateCalendarYearMutation()

  const allEvents = useMemo(
    () => calendarEventsQuery.data ?? [],
    [calendarEventsQuery.data],
  )
  const activeEvents = useMemo(
    () => allEvents.filter((event) => event.isActive),
    [allEvents],
  )
  const archivedEvents = useMemo(
    () => allEvents.filter((event) => !event.isActive),
    [allEvents],
  )
  const editingEvent = allEvents.find((event) => event.id === editingId) ?? null
  const actorName = user?.displayName ?? user?.email ?? null

  const operationalAssignmentMap = useMemo(
    () => buildOperationalAssignmentMapByCalendarEventId(assignmentsQuery.data ?? []),
    [assignmentsQuery.data],
  )
  const assignmentCountMap = useMemo(
    () => buildAssignmentCountMapByCalendarEventId(assignmentsQuery.data ?? []),
    [assignmentsQuery.data],
  )

  const monthlySections = useMemo(
    () => groupCalendarEventsByMonth(activeYear, activeEvents),
    [activeEvents, activeYear],
  )

  const saturdayDates = useMemo(
    () => listSaturdayDateValuesForYear(activeYear),
    [activeYear],
  )
  const occupiedSaturdayKeys = useMemo(
    () => new Set(activeEvents.map((event) => toLocalDateKey(event.date))),
    [activeEvents],
  )
  const firstAvailableSaturdayDate = findFirstAvailableSaturdayDate(
    saturdayDates,
    occupiedSaturdayKeys,
  )
  const editingEventHasLinkedAssignments = editingEvent
    ? (assignmentCountMap.get(editingEvent.id) ?? 0) > 0
    : false

  const stats = useMemo(() => {
    const blocked = activeEvents.filter((event) => event.blocksAssignments).length
    const publicTalks = activeEvents.filter(
      (event) => event.type === 'publicTalk',
    ).length
    const assignedPublicTalks = activeEvents.filter(
      (event) => event.type === 'publicTalk' && operationalAssignmentMap.has(event.id),
    ).length
    const missingSaturdayCount = saturdayDates.filter(
      (dateValue) => !occupiedSaturdayKeys.has(dateValue),
    ).length

    return {
      total: activeEvents.length,
      blocked,
      publicTalks,
      assignedPublicTalks,
      archived: archivedEvents.length,
      missingSaturdayCount,
    }
  }, [
    activeEvents,
    archivedEvents.length,
    occupiedSaturdayKeys,
    operationalAssignmentMap,
    saturdayDates,
  ])

  const {
    clearErrors,
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: buildCreateModeFormValues(firstAvailableSaturdayDate),
  })

  const watchedType =
    useWatch({
      control,
      name: 'type',
    }) ?? 'publicTalk'
  const watchedDate =
    useWatch({
      control,
      name: 'date',
    }) ?? ''
  const watchedIsActive =
    useWatch({
      control,
      name: 'isActive',
    }) ?? true

  const isSubmitting =
    createCalendarEventMutation.isPending ||
    updateCalendarEventMutation.isPending ||
    deleteCalendarEventMutation.isPending ||
    generateCalendarYearMutation.isPending

  const totalQueryErrors = [
    calendarEventsQuery.error,
    assignmentsQuery.error,
    congregationsQuery.error,
  ].filter(Boolean)

  const formModeLabel = editingEvent ? 'Editar evento' : 'Novo evento'

  function getSuggestedSaturdayDate(options?: {
    occupyDates?: string[]
    releaseDates?: string[]
  }) {
    const optimisticOccupiedSaturdayKeys = new Set(occupiedSaturdayKeys)

    options?.occupyDates?.forEach((dateValue) => {
      optimisticOccupiedSaturdayKeys.add(dateValue)
    })
    options?.releaseDates?.forEach((dateValue) => {
      optimisticOccupiedSaturdayKeys.delete(dateValue)
    })

    return findFirstAvailableSaturdayDate(
      saturdayDates,
      optimisticOccupiedSaturdayKeys,
    )
  }

  useEffect(() => {
    if (editingId || isDirty || watchedDate.length > 0 || firstAvailableSaturdayDate.length === 0) {
      return
    }

    setValue('date', firstAvailableSaturdayDate)
  }, [
    editingId,
    firstAvailableSaturdayDate,
    isDirty,
    setValue,
    watchedDate,
  ])

  function handleChangeYear(nextYear: number) {
    setSelectedYearOverride(nextYear)
    setEditingId(null)
    setFeedback(null)
    reset(buildCreateModeFormValues(''))
  }

  const submitHandler = handleSubmit(async (values) => {
    clearErrors('date')

    try {
      const parsedDate = parseDateInputValue(values.date)

      if (parsedDate.getFullYear() !== activeYear) {
        setError('date', {
          type: 'validate',
          message: `Use uma data dentro de ${activeYear}.`,
        })
        return
      }
    } catch {
      setError('date', {
        type: 'validate',
        message: 'Informe uma data valida.',
      })
      return
    }

    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessao expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      if (editingEvent) {
        await updateCalendarEventMutation.mutateAsync({
          id: editingEvent.id,
          ...values,
          actorUid: user.uid,
          actorName,
          targetYear: activeYear,
        })

        setFeedback({
          tone: 'success',
          message: 'Evento atualizado com sucesso no calendario anual.',
        })
      } else {
        await createCalendarEventMutation.mutateAsync({
          ...values,
          actorUid: user.uid,
          actorName,
          targetYear: activeYear,
        })

        setFeedback({
          tone: 'success',
          message: 'Evento criado com sucesso no calendario anual.',
        })
      }

      setEditingId(null)
      reset(
        buildCreateModeFormValues(
          getSuggestedSaturdayDate({
            occupyDates: values.isActive ? [values.date] : [],
          }),
        ),
      )
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  })

  async function handleGenerateYear() {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessao expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      const result = await generateCalendarYearMutation.mutateAsync({
        year: activeYear,
        actorUid: user.uid,
        actorName,
      })

      if (result.createdCount === 0) {
        setFeedback({
          tone: 'success',
          message: `Todos os ${result.skippedCount} sabados de ${activeYear} ja possuem evento ativo.`,
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: `${result.createdCount} sabado(s) foram gerados automaticamente para ${activeYear}. ${result.skippedCount} ja existiam.`,
      })
      reset(
        buildCreateModeFormValues(
          getSuggestedSaturdayDate({
            occupyDates: saturdayDates.filter(
              (dateValue) => !occupiedSaturdayKeys.has(dateValue),
            ),
          }),
        ),
      )
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessao expirou. Entre novamente para continuar.',
      })
      return
    }

    const confirmed = window.confirm(
      `Arquivar o evento "${title}" da agenda ativa? Ele continuara no historico administrativo do ano.`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      const deletedEvent = allEvents.find((event) => event.id === id) ?? null

      await deleteCalendarEventMutation.mutateAsync({
        id,
        actorUid: user.uid,
        actorName,
      })

      if (editingId === id) {
        setEditingId(null)
      }

      reset(
        buildCreateModeFormValues(
          getSuggestedSaturdayDate({
            releaseDates: deletedEvent ? [toLocalDateKey(deletedEvent.date)] : [],
          }),
        ),
      )

      setFeedback({
        tone: 'success',
        message: 'Evento arquivado com sucesso.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  function handleStartCreate() {
    setEditingId(null)
    setFeedback(null)
    reset(buildCreateModeFormValues(firstAvailableSaturdayDate))
  }

  function handleStartEdit(id: string) {
    const calendarEvent = allEvents.find((event) => event.id === id)

    setEditingId(id)
    setFeedback(null)

    if (calendarEvent) {
      reset(toCalendarEventFormValues(calendarEvent))
    }
  }

  function handleTypeChange(type: CalendarEventType) {
    if (!editingEvent) {
      setValue('title', calendarEventDefaultTitles[type], {
        shouldDirty: true,
      })
    }
  }

  const typeHelperText = getBlocksAssignmentsForEventType(watchedType)
    ? 'Congresso e assembleia bloqueiam designacoes automaticamente pela regra oficial.'
    : watchedType === 'publicTalk'
      ? 'Use para os sabados regulares que podem receber designacoes.'
      : 'Evento especial sem bloqueio automatico de designacoes nesta fase.'

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-3xl">Calendario inteligente</CardTitle>
            <CardDescription className="mt-2 text-base">
              A Fase 7 entrega geracao automatica de sabados, calendario anual
              operacional e controle real dos tipos de evento em `calendarEvents`.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Ano anterior"
                onClick={() => handleChangeYear(activeYear - 1)}
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
                onClick={() => handleChangeYear(activeYear + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => handleChangeYear(currentYear)}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateYear}
              disabled={isSubmitting}
            >
              <Sparkles className="size-4" />
              Gerar sabados do ano
            </Button>
            <Button onClick={handleStartCreate} disabled={isSubmitting}>
              <Plus className="size-4" />
              Novo evento
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Eventos ativos</p>
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
            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Sabados sem evento</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.missingSaturdayCount}
              </p>
            </div>
          </div>

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
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{formModeLabel}</CardTitle>
                <CardDescription>
                  {editingEvent
                    ? 'Atualize o evento mantendo a agenda coerente com as regras oficiais.'
                    : 'Cadastre congresso, assembleia, visita ou outro evento do calendario anual.'}
                </CardDescription>
              </div>

              {editingEvent ? (
                <Button
                  variant="outline"
                  onClick={handleStartCreate}
                  disabled={isSubmitting}
                >
                  Cancelar edicao
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge className="bg-primary/10 text-primary">{activeYear}</Badge>
              <Badge variant="outline">{stats.archived} arquivado(s)</Badge>
              <span>{typeHelperText}</span>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={submitHandler}>
              <input
                type="checkbox"
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                {...register('isActive')}
                checked={watchedIsActive}
                readOnly
              />
              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Data</span>
                    <Input
                      type="date"
                      {...register('date')}
                      disabled={editingEventHasLinkedAssignments}
                    />
                  {errors.date ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.date.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Tipo</span>
                  <select
                    className={selectClassName}
                    {...register('type', {
                      onChange: (event) => {
                        handleTypeChange(event.target.value as CalendarEventType)
                      },
                    })}
                    value={watchedType}
                    disabled={editingEventHasLinkedAssignments}
                  >
                    {Object.entries(calendarEventTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {errors.type ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.type.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Titulo</span>
                  <Input
                    placeholder="Ex.: Congresso regional"
                    {...register('title')}
                  />
                  {errors.title ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.title.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Congregacao vinculada
                  </span>
                  <select className={selectClassName} {...register('congregationId')}>
                    <option value="">Sem vinculacao</option>
                    {(congregationsQuery.data ?? []).map((congregation) => (
                      <option key={congregation.id} value={congregation.id}>
                        {congregation.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                        watchedIsActive
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isActive', true, {
                          shouldDirty: true,
                        })
                      }
                      disabled={editingEventHasAssignment}
                    >
                      <p className="font-medium text-foreground">Ativo</p>
                      <p className="mt-1 leading-6">
                        Permanece na agenda anual e nas proximas designacoes.
                      </p>
                    </button>
                    <button
                      type="button"
                      className={`rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                        !watchedIsActive
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isActive', false, {
                          shouldDirty: true,
                        })
                      }
                      disabled={editingEventHasAssignment}
                    >
                      <p className="font-medium text-foreground">Arquivado</p>
                      <p className="mt-1 leading-6">
                        Sai da operacao atual, mas continua disponivel para revisao.
                      </p>
                    </button>
                  </div>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Observacoes
                  </span>
                  <Textarea
                    placeholder="Anote detalhes operacionais do evento anual."
                    {...register('description')}
                  />
                </label>
              </div>

              {editingEventHasLinkedAssignments ? (
                <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  Este evento ja possui designacoes vinculadas no historico. Data,
                  tipo, status e arquivamento ficam bloqueados nesta fase para
                  preservar a integridade operacional.
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {editingEvent
                    ? `Ultima atualizacao em ${formatUpdatedAt(
                        editingEvent.updatedAt.toDate(),
                      )}.`
                    : 'Congressos e assembleias ativam bloqueio de designacao automaticamente.'}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isDirty}
                    onClick={() => reset(toCalendarEventFormValues(editingEvent))}
                  >
                    Restaurar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Plus className="size-4" />
                    {editingEvent ? 'Salvar alteracoes' : 'Cadastrar evento'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Regras aplicadas agora</CardTitle>
            <CardDescription className="mt-2">
              A Fase 7 prepara a base anual sem antecipar o CRUD completo de
              designacoes da Fase 8.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              RN002 e RN003: congresso e assembleia sao salvos com
              `blocksAssignments = true` automaticamente.
            </div>
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              Geracao anual cria apenas sabados sem evento ativo, evitando
              duplicidades no mesmo dia.
            </div>
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              Eventos com designacoes vinculadas nao podem mudar data, tipo ou ser
              arquivados nesta fase.
            </div>
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              Toda criacao, edicao, geracao automatica e arquivamento gera auditoria
              em `auditLogs`.
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">Visao anual</CardTitle>
              <CardDescription>
                Calendario completo por mes, cruzando `calendarEvents` com
                `assignments` para destacar sabados ja cobertos.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                {stats.assignedPublicTalks} com designacao
              </Badge>
              <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                {stats.blocked} bloqueios
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
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
          activeEvents.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
              Nenhum evento ativo encontrado para {activeYear}. Gere os sabados do
              ano ou cadastre um evento manual para iniciar a agenda.
            </div>
          ) : null}

          {!calendarEventsQuery.isLoading &&
          !calendarEventsQuery.isError &&
          activeEvents.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              {monthlySections.map((month) => (
                <div
                  key={`${activeYear}-${month.monthIndex}`}
                  className="rounded-[22px] border border-border/70 bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {month.monthLabel} {activeYear}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {month.events.length} evento(s)
                      </p>
                    </div>
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
                        const assignment = operationalAssignmentMap.get(event.id)

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
                                  event.isActive,
                                )}
                              >
                                {calendarEventTypeLabels[event.type]}
                              </Badge>
                            </div>

                            <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                              {event.title}
                            </p>

                            {event.congregationName ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {event.congregationName}
                              </p>
                            ) : null}

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
                                Sem designacao ativa no momento.
                              </div>
                            ) : null}

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleStartEdit(event.id)}
                                disabled={isSubmitting}
                              >
                                <PencilLine className="size-4" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleDelete(event.id, event.title)}
                                disabled={
                                  isSubmitting ||
                                  (assignmentCountMap.get(event.id) ?? 0) > 0
                                }
                              >
                                <Trash2 className="size-4" />
                                Arquivar
                              </Button>
                            </div>
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

      {archivedEvents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Eventos arquivados do ano</CardTitle>
            <CardDescription className="mt-2">
              Itens fora da agenda ativa, mas ainda acessiveis para revisao e
              reativacao por edicao.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {archivedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-[20px] border border-border/70 bg-background p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Arquivado</Badge>
                      <Badge
                        className={getEventBadgeClassName(
                          event.type,
                          event.blocksAssignments,
                          operationalAssignmentMap.has(event.id),
                          event.isActive,
                        )}
                      >
                        {calendarEventTypeLabels[event.type]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatCalendarDate(event)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      {event.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {event.description || 'Sem observacoes cadastradas.'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleStartEdit(event.id)}
                    disabled={isSubmitting}
                  >
                    <PencilLine className="size-4" />
                    Revisar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
