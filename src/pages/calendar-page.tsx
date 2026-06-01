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
  X,
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
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useAssignmentsByYearQuery } from '@/hooks/use-assignments'
import {
  useCalendarEventsManagementQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useRequestManualGoogleCalendarSyncMutation,
  useUpdateCalendarEventMutation,
} from '@/hooks/use-calendar-events'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { cn } from '@/lib/utils'
import {
  isImplicitCalendarAgendaEvent,
  type CalendarAgendaEvent,
} from '@/services/firestore/calendar-slots-service'
import {
  defaultCalendarEventFormValues,
  toCalendarEventFormValues,
  type CalendarEventFormValues,
} from '@/services/firestore/calendar-events-service'
import {
  calendarEventTypeSchema,
  type CalendarEventType,
} from '@/types/firestore'
import {
  assignmentStatusLabels,
  buildAssignmentCountMapByCalendarEventId,
  buildOperationalAssignmentMapByCalendarEventId,
  calendarEventDefaultTitles,
  calendarEventTypeLabels,
  formatCalendarDate,
  formatCalendarDay,
  listSaturdayDateValuesForYear,
  parseDateInputValue,
  toLocalDateKey,
} from '@/utils/calendar-events'

const currentYear = new Date().getFullYear()
const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
})

const selectClassName =
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70'

const calendarEventFormSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')
    .refine(
      (value) => {
        try {
          parseDateInputValue(value)
          return true
        } catch {
          return false
        }
      },
      'Informe uma data válida.',
    ),
  type: calendarEventTypeSchema,
  title: z.string().trim().min(3, 'Informe um título claro para o evento.'),
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

type ComposerIntent = 'new' | 'slot' | 'edit'

type MonthPlanningSummary = {
  monthIndex: number
  monthLabel: string
  events: CalendarAgendaEvent[]
  publicTalkCount: number
  coveredPublicTalkCount: number
  uncoveredPublicTalkCount: number
  blockedCount: number
  specialCount: number
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível concluir a operação no calendário.'
}

function getFeedbackContainerClassName(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
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

function getMonthPlanningTone(summary: MonthPlanningSummary) {
  if (summary.uncoveredPublicTalkCount > 0) {
    return 'warning'
  }

  if (summary.publicTalkCount > 0 && summary.uncoveredPublicTalkCount === 0) {
    return 'success'
  }

  return 'neutral'
}

function getMonthPlanningStatus(summary: MonthPlanningSummary) {
  if (summary.uncoveredPublicTalkCount > 0) {
    return `${summary.uncoveredPublicTalkCount} discurso(s) sem designação`
  }

  if (summary.publicTalkCount > 0) {
    return 'Cobertura em dia'
  }

  if (summary.blockedCount > 0) {
    return `${summary.blockedCount} bloqueio(s) confirmado(s)`
  }

  if (summary.specialCount > 0) {
    return `${summary.specialCount} evento(s) confirmado(s)`
  }

  return 'Sem movimento no mês'
}

function getMonthPlanningStatusClassName(summary: MonthPlanningSummary) {
  const tone = getMonthPlanningTone(summary)

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  }

  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'border-border/70 bg-secondary/60 text-secondary-foreground'
}

function getMonthGridClassName(eventCount: number) {
  return cn(
    'grid gap-3 md:grid-cols-2',
    eventCount >= 5 && 'xl:grid-cols-3',
  )
}

function getEventCardClassName(event: CalendarAgendaEvent, hasAssignment: boolean) {
  if (event.blocksAssignments) {
    return 'border-rose-200/80 bg-rose-50/55 dark:border-rose-500/20 dark:bg-rose-500/5'
  }

  if (hasAssignment && event.type === 'publicTalk') {
    return 'border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-500/20 dark:bg-emerald-500/5'
  }

  if (event.type !== 'publicTalk') {
    return 'border-sky-200/80 bg-sky-50/55 dark:border-sky-500/20 dark:bg-sky-500/5'
  }

  return 'border-border/70 bg-background'
}

function formatCalendarWeekday(event: CalendarAgendaEvent) {
  return event.date
    .toDate()
    .toLocaleDateString('pt-BR', { weekday: 'short' })
    .replace('.', '')
}

function formatUpdatedAt(value: Date) {
  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
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
  const [composerIntent, setComposerIntent] = useState<ComposerIntent>('new')
  const [editingViewId, setEditingViewId] = useState<string | null>(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const activeYear =
    selectedYearOverride ?? appSettingsQuery.data?.defaultYear ?? currentYear
  const calendarEventsQuery = useCalendarEventsManagementQuery(activeYear)
  const assignmentsQuery = useAssignmentsByYearQuery(activeYear)
  const congregationsQuery = useCongregationsQuery()

  const createCalendarEventMutation = useCreateCalendarEventMutation()
  const updateCalendarEventMutation = useUpdateCalendarEventMutation()
  const moveCalendarEventToDraftMutation = useDeleteCalendarEventMutation()
  const requestManualGoogleCalendarSyncMutation =
    useRequestManualGoogleCalendarSyncMutation()

  const allEvents = useMemo<CalendarAgendaEvent[]>(
    () => (calendarEventsQuery.data as CalendarAgendaEvent[] | undefined) ?? [],
    [calendarEventsQuery.data],
  )
  const activeEvents = useMemo(
    () => allEvents.filter((event) => event.isActive),
    [allEvents],
  )
  const draftEvents = useMemo(
    () => allEvents.filter((event) => !event.isActive),
    [allEvents],
  )
  const editingEvent =
    allEvents.find((event) => event.viewId === editingViewId) ?? null
  const actorName = user?.displayName ?? user?.email ?? null

  const operationalAssignmentMap = useMemo(
    () => buildOperationalAssignmentMapByCalendarEventId(assignmentsQuery.data ?? []),
    [assignmentsQuery.data],
  )
  const assignmentCountMap = useMemo(
    () => buildAssignmentCountMapByCalendarEventId(assignmentsQuery.data ?? []),
    [assignmentsQuery.data],
  )

  const saturdayDates = useMemo(
    () => listSaturdayDateValuesForYear(activeYear),
    [activeYear],
  )
  const defaultCreateDate = useMemo(() => {
    const todayKey = toLocalDateKey(new Date())
    const upcomingSaturday = saturdayDates.find((dateValue) => dateValue >= todayKey)

    return upcomingSaturday ?? saturdayDates[0] ?? ''
  }, [saturdayDates])

  const monthPlanningSummaries = useMemo<MonthPlanningSummary[]>(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDate = new Date(activeYear, monthIndex, 1)
      const events = activeEvents.filter(
        (event) => event.date.toDate().getMonth() === monthIndex,
      )
      const publicTalkCount = events.filter((event) => event.type === 'publicTalk').length
      const coveredPublicTalkCount = events.filter(
        (event) =>
          event.type === 'publicTalk' && operationalAssignmentMap.has(event.id),
      ).length
      const blockedCount = events.filter((event) => event.blocksAssignments).length
      const specialCount = events.filter(
        (event) => event.type !== 'publicTalk' && !event.blocksAssignments,
      ).length

      return {
        monthIndex,
        monthLabel: capitalize(monthFormatter.format(monthDate)),
        events,
        publicTalkCount,
        coveredPublicTalkCount,
        uncoveredPublicTalkCount: publicTalkCount - coveredPublicTalkCount,
        blockedCount,
        specialCount,
      }
    })
  }, [activeEvents, activeYear, operationalAssignmentMap])

  const stats = useMemo(() => {
    const blocked = activeEvents.filter((event) => event.blocksAssignments).length
    const confirmed = activeEvents.length
    const assignedPublicTalks = activeEvents.filter(
      (event) => event.type === 'publicTalk' && operationalAssignmentMap.has(event.id),
    ).length
    const publicTalks = activeEvents.filter((event) => event.type === 'publicTalk').length

    return {
      blocked,
      confirmed,
      draftCount: draftEvents.length,
      assignedPublicTalks,
      publicTalks,
      uncoveredPublicTalkCount: publicTalks - assignedPublicTalks,
    }
  }, [activeEvents, draftEvents.length, operationalAssignmentMap])

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
    defaultValues: buildCreateModeFormValues(defaultCreateDate),
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
    moveCalendarEventToDraftMutation.isPending ||
    requestManualGoogleCalendarSyncMutation.isPending

  const totalQueryErrors = [
    calendarEventsQuery.error,
    assignmentsQuery.error,
    congregationsQuery.error,
  ].filter(Boolean)

  const editingEventHasLinkedAssignments = editingEvent
    ? (assignmentCountMap.get(editingEvent.id) ?? 0) > 0
    : false
  const formModeLabel = editingEvent
    ? editingEvent.isActive
      ? 'Editar evento'
      : 'Editar rascunho'
    : composerIntent === 'slot'
      ? 'Adicionar evento'
      : 'Novo evento'
  const submitButtonLabel = watchedIsActive
    ? editingEvent
      ? 'Salvar evento'
      : composerIntent === 'slot'
        ? 'Adicionar evento'
        : 'Criar evento'
    : 'Salvar rascunho'

  useEffect(() => {
    if (editingViewId || isDirty || watchedDate.length > 0 || defaultCreateDate.length === 0) {
      return
    }

    setValue('date', defaultCreateDate)
  }, [
    defaultCreateDate,
    editingViewId,
    isDirty,
    setValue,
    watchedDate,
  ])

  function handleCloseComposer() {
    setIsComposerOpen(false)
    setComposerIntent('new')
    setEditingViewId(null)
    reset(buildCreateModeFormValues(defaultCreateDate))
  }

  function handleComposerOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setIsComposerOpen(true)
      return
    }

    handleCloseComposer()
  }

  function handleChangeYear(nextYear: number) {
    setSelectedYearOverride(nextYear)
    setFeedback(null)
    handleCloseComposer()
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
        message: 'Informe uma data válida.',
      })
      return
    }

    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      if (editingEvent && !isImplicitCalendarAgendaEvent(editingEvent)) {
        await updateCalendarEventMutation.mutateAsync({
          id: editingEvent.id,
          ...values,
          actorUid: user.uid,
          actorName,
          targetYear: activeYear,
        })

        setFeedback({
          tone: 'success',
          message: values.isActive
            ? 'Evento atualizado com sucesso no planejamento anual.'
            : 'Rascunho atualizado com sucesso.',
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
          message: values.isActive
            ? composerIntent === 'slot'
              ? 'Evento adicionado com sucesso ao planejamento anual.'
              : 'Evento criado com sucesso no planejamento anual.'
            : 'Rascunho salvo com sucesso.',
        })
      }

      handleCloseComposer()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  })

  async function handleMoveToDraft(id: string, title: string) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    const confirmed = window.confirm(
      `Mover o evento "${title}" para rascunho? Ele sai da agenda confirmada, mas continua disponível para revisão.`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      await moveCalendarEventToDraftMutation.mutateAsync({
        id,
        actorUid: user.uid,
        actorName,
      })

      if (editingEvent?.id === id) {
        handleCloseComposer()
      }

      setFeedback({
        tone: 'success',
        message: 'Evento movido para rascunho.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  async function handleRetryGoogleCalendarSync(calendarEventId: string) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      await requestManualGoogleCalendarSyncMutation.mutateAsync({
        actorUid: user.uid,
        actorName,
        calendarEventId,
      })
      setFeedback({
        tone: 'success',
        message: 'O evento voltou para a fila de sincronização da agenda.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  function handleStartCreate(preferredDate = defaultCreateDate, intent: ComposerIntent = 'new') {
    setComposerIntent(intent)
    setEditingViewId(null)
    setFeedback(null)
    setIsComposerOpen(true)
    reset(buildCreateModeFormValues(preferredDate))
  }

  function handleStartEdit(viewId: string) {
    const calendarEvent = allEvents.find((event) => event.viewId === viewId)

    if (!calendarEvent) {
      return
    }

    setComposerIntent('edit')
    setEditingViewId(viewId)
    setFeedback(null)
    setIsComposerOpen(true)
    reset(toCalendarEventFormValues(calendarEvent))
  }

  function handleTypeChange(type: CalendarEventType) {
    if (!editingEvent) {
      setValue('title', calendarEventDefaultTitles[type], {
        shouldDirty: true,
      })
      return
    }

    if (isImplicitCalendarAgendaEvent(editingEvent)) {
      setValue('title', calendarEventDefaultTitles[type], {
        shouldDirty: true,
      })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Planejamento"
        title="Planejamento anual"
        description="Visualize o ano inteiro, acompanhe a cobertura de cada sábado e adicione exceções sem poluir a agenda."
      />

      <section className="rounded-[22px] border border-border/70 bg-card p-3 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_40px_-30px_rgba(2,8,23,0.82)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-2xl"
              aria-label="Ano anterior"
              onClick={() => handleChangeYear(activeYear - 1)}
            >
              <ChevronLeft className="size-4.5" />
            </Button>
            <div className="rounded-2xl border border-border/70 bg-background px-5 py-3 text-base font-semibold text-foreground">
              {activeYear}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-2xl"
              aria-label="Próximo ano"
              onClick={() => handleChangeYear(activeYear + 1)}
            >
              <ChevronRight className="size-4.5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl px-5"
              onClick={() => handleChangeYear(currentYear)}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl px-5"
              onClick={() => handleStartCreate()}
              disabled={isSubmitting}
            >
              <Plus className="size-4.5" />
              Novo evento
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryStat
          label="Confirmados"
          value={String(stats.confirmed)}
          detail="Datas que já aparecem na agenda principal do ano."
          icon={CalendarDays}
          tone="blue"
        />
        <SummaryStat
          label="Rascunhos"
          value={String(stats.draftCount)}
          detail="Exceções salvas fora da agenda confirmada."
          icon={PencilLine}
          tone="slate"
        />
        <SummaryStat
          label="Bloqueios"
          value={String(stats.blocked)}
          detail="Congressos e assembleias que travam designações."
          icon={ShieldBan}
          tone="amber"
        />
        <SummaryStat
          label="Já cobertos"
          value={String(stats.assignedPublicTalks)}
          detail="Sábados com designação ativa no momento."
          icon={CalendarDays}
          tone="green"
        />
        <SummaryStat
          label="Sem designação"
          value={String(stats.uncoveredPublicTalkCount)}
          detail="Sábados regulares ainda aguardando cobertura."
          icon={Sparkles}
          tone="amber"
        />
      </section>

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

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">Visão anual</CardTitle>
              <CardDescription>
                Acompanhe mês a mês o que está coberto, quais datas receberam evento confirmado e o que ainda precisa de designação.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                {stats.assignedPublicTalks} cobertos
              </Badge>
              <Badge
                className={cn(
                  stats.uncoveredPublicTalkCount > 0
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {stats.uncoveredPublicTalkCount} sem designação
              </Badge>
              <Badge variant="outline">{stats.draftCount} rascunho(s)</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {calendarEventsQuery.isLoading || assignmentsQuery.isLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 12 }, (_, index) => (
                <div
                  key={index}
                  className="h-60 animate-pulse rounded-[20px] border border-border/70 bg-background"
                />
              ))}
            </div>
          ) : null}

          {!calendarEventsQuery.isLoading &&
          !calendarEventsQuery.isError &&
          activeEvents.length === 0 ? (
            <EmptyState
              title={`Nenhuma data visível em ${activeYear}`}
              description="Não foi possível montar a agenda anual agora."
            />
          ) : null}

          {!calendarEventsQuery.isLoading &&
          !calendarEventsQuery.isError &&
          activeEvents.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {monthPlanningSummaries.map((month) => (
                <div
                  key={`${activeYear}-${month.monthIndex}`}
                  className={cn(
                    'rounded-[22px] border bg-background p-4 transition',
                    getMonthPlanningTone(month) === 'warning' &&
                      'border-amber-200/80 dark:border-amber-500/20',
                    getMonthPlanningTone(month) === 'success' &&
                      'border-emerald-200/80 dark:border-emerald-500/20',
                    getMonthPlanningTone(month) === 'neutral' && 'border-border/70',
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {month.monthLabel} {activeYear}
                          </h3>
                          <Badge className={getMonthPlanningStatusClassName(month)}>
                            {getMonthPlanningStatus(month)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {month.events.length} data(s) visível(is) neste mês.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{month.publicTalkCount} discurso(s)</Badge>
                        {month.coveredPublicTalkCount > 0 ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                            {month.coveredPublicTalkCount} coberto(s)
                          </Badge>
                        ) : null}
                        {month.blockedCount > 0 ? (
                          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                            {month.blockedCount} bloqueio(s)
                          </Badge>
                        ) : null}
                        {month.specialCount > 0 ? (
                          <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                            {month.specialCount} especial(is)
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className={getMonthGridClassName(month.events.length)}>
                      {month.events.map((event) => {
                        const assignment = operationalAssignmentMap.get(event.id) ?? null
                        const isImplicitEvent = isImplicitCalendarAgendaEvent(event)
                        const canRetryStandaloneGoogleCalendarSync =
                          event.type !== 'publicTalk' &&
                          event.googleCalendarSyncStatus === 'error'
                        const canMoveToDraft =
                          !isImplicitEvent && (assignmentCountMap.get(event.id) ?? 0) === 0
                        const eventHeading = isImplicitEvent ? 'Sábado regular' : event.title

                        return (
                          <div
                            key={event.viewId}
                            className={cn(
                              'rounded-[18px] border px-3.5 py-3',
                              getEventCardClassName(event, Boolean(assignment)),
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xl font-semibold leading-none text-foreground">
                                  {formatCalendarDay(event)}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                                  {formatCalendarWeekday(event)}
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

                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-semibold leading-5 text-foreground">
                                {eventHeading}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCalendarDate(event)}
                              </p>

                              {event.congregationName ? (
                                <p className="text-xs text-muted-foreground">
                                  {event.congregationName}
                                </p>
                              ) : null}

                              {event.description ? (
                                <p className="text-xs leading-5 text-muted-foreground">
                                  {event.description}
                                </p>
                              ) : null}
                            </div>

                            {event.blocksAssignments ? (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                                <ShieldBan className="size-3.5" />
                                Bloqueia designações
                              </div>
                            ) : null}

                            {assignment ? (
                              <div className="mt-3 rounded-[16px] border border-border/60 bg-background/80 px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className={getAssignmentBadgeClassName(assignment.status)}
                                  >
                                    {assignmentStatusLabels[assignment.status]}
                                  </Badge>
                                  <span className="text-xs font-medium text-foreground">
                                    {assignment.speakerName}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                  Tema {assignment.themeNumber} - {assignment.themeTitle}
                                </p>
                              </div>
                            ) : event.type === 'publicTalk' ? (
                              <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                Sem designação ativa no momento.
                              </div>
                            ) : null}

                            {canRetryStandaloneGoogleCalendarSync ? (
                              <div className="mt-3 rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                                <p>
                                  {event.googleCalendarSyncError ||
                                    'A última sincronização com a agenda falhou.'}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-3 h-9 w-full rounded-xl"
                                  onClick={() => void handleRetryGoogleCalendarSync(event.id)}
                                  disabled={isSubmitting}
                                >
                                  Tentar novamente
                                </Button>
                              </div>
                            ) : null}

                            <div
                              className={cn(
                                'mt-4 grid gap-2',
                                isImplicitEvent ? 'grid-cols-1' : 'grid-cols-2',
                              )}
                            >
                              {isImplicitEvent ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 rounded-xl"
                                  onClick={() =>
                                    handleStartCreate(toLocalDateKey(event.date), 'slot')
                                  }
                                  disabled={isSubmitting}
                                >
                                  <Plus className="size-3.5" />
                                  Adicionar
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-xl"
                                    onClick={() => handleStartEdit(event.viewId)}
                                    disabled={isSubmitting}
                                  >
                                    <PencilLine className="size-3.5" />
                                    Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-xl"
                                    onClick={() => handleMoveToDraft(event.id, event.title)}
                                    disabled={isSubmitting || !canMoveToDraft}
                                  >
                                    <Trash2 className="size-3.5" />
                                    Rascunho
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {draftEvents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Rascunhos do ano</CardTitle>
            <CardDescription className="mt-2">
              Eventos salvos fora da agenda confirmada. Revise e confirme quando quiser que substituam a data regular.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {draftEvents.map((event) => (
              <div
                key={event.viewId}
                className="rounded-[18px] border border-border/70 bg-background p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Rascunho</Badge>
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
                      {event.description || 'Sem observações cadastradas.'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl px-5"
                    onClick={() => handleStartEdit(event.viewId)}
                    disabled={isSubmitting}
                  >
                    <PencilLine className="size-4" />
                    Editar rascunho
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Modal open={isComposerOpen} onOpenChange={handleComposerOpenChange}>
        <ModalContent className="overflow-hidden">
          <form onSubmit={submitHandler}>
            <input
              type="checkbox"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              {...register('isActive')}
              checked={watchedIsActive}
              readOnly
            />

            <ModalHeader className="border-b border-border/70">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <ModalTitle>{formModeLabel}</ModalTitle>
                    <Badge className="bg-primary/10 text-primary">{activeYear}</Badge>
                    <Badge variant="outline">
                      {watchedIsActive ? 'Confirmado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <ModalDescription className="mt-2">
                    {editingEvent
                      ? 'Ajuste a data com uma estrutura confortável no desktop e pronta para celular.'
                      : composerIntent === 'slot'
                        ? 'Use este modal para confirmar uma exceção no sábado selecionado ou deixá-la como rascunho.'
                        : 'Cadastre congresso, assembleia, visita ou outro evento importante sem ocupar espaço fixo na tela anual.'}
                  </ModalDescription>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-2xl"
                  onClick={() => handleCloseComposer()}
                  disabled={isSubmitting}
                  aria-label="Fechar modal"
                >
                  <X className="size-4.5" />
                </Button>
              </div>
            </ModalHeader>

            <ModalBody className="max-h-[calc(100vh-220px)] overflow-y-auto">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_320px]">
                <div className="grid gap-4 md:grid-cols-2">
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

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Título</span>
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

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">
                      Congregação vinculada
                    </span>
                    <select className={selectClassName} {...register('congregationId')}>
                      <option value="">Sem vinculação</option>
                      {(congregationsQuery.data ?? []).map((congregation) => (
                        <option key={congregation.id} value={congregation.id}>
                          {congregation.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Observações</span>
                    <Textarea
                      placeholder="Anote detalhes úteis sobre esta data."
                      className="min-h-36"
                      {...register('description')}
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[22px] border border-border/70 bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">Status do cadastro</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Confirme quando a data já deve valer na agenda anual. Use rascunho quando ainda estiver revisando a exceção.
                    </p>

                    <div className="mt-4 grid gap-3">
                      <button
                        type="button"
                        className={cn(
                          'rounded-[16px] border px-4 py-3.5 text-left text-sm transition',
                          watchedIsActive
                            ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                            : 'border-border/80 bg-background text-muted-foreground hover:bg-accent',
                        )}
                        onClick={() =>
                          setValue('isActive', true, {
                            shouldDirty: true,
                          })
                        }
                        disabled={editingEventHasLinkedAssignments}
                      >
                        <p className="font-medium text-foreground">Confirmado</p>
                        <p className="mt-1 leading-6">
                          Entra imediatamente na agenda anual e substitui o sábado regular quando for a mesma data.
                        </p>
                      </button>

                      <button
                        type="button"
                        className={cn(
                          'rounded-[16px] border px-4 py-3.5 text-left text-sm transition',
                          !watchedIsActive
                            ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                            : 'border-border/80 bg-background text-muted-foreground hover:bg-accent',
                        )}
                        onClick={() =>
                          setValue('isActive', false, {
                            shouldDirty: true,
                          })
                        }
                        disabled={editingEventHasLinkedAssignments}
                      >
                        <p className="font-medium text-foreground">Rascunho</p>
                        <p className="mt-1 leading-6">
                          Fica salvo para revisão, mas ainda não aparece na agenda confirmada do ano.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-border/70 bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">Leitura rápida</p>
                    <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                      <p>
                        {editingEvent
                          ? `Última atualização em ${formatUpdatedAt(
                              editingEvent.updatedAt.toDate(),
                            )}.`
                          : watchedIsActive
                            ? 'O evento será salvo como confirmado e entra na agenda do ano.'
                            : 'O evento será salvo como rascunho para revisão posterior.'}
                      </p>
                      <p>
                        {composerIntent === 'slot'
                          ? 'Você está adicionando uma exceção para uma data que hoje está seguindo o sábado regular implícito.'
                          : 'Use este modal para congressos, assembleias, visitas e qualquer ajuste pontual do calendário.'}
                      </p>
                    </div>
                  </div>

                  {editingEventHasLinkedAssignments ? (
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      Este evento já possui designações vinculadas. Data, tipo e mudança de confirmação ficam protegidos para preservar o histórico.
                    </div>
                  ) : null}
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="bg-card/95">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {editingEvent
                    ? 'Revise os detalhes e salve quando terminar.'
                    : 'Tudo pronto para registrar essa data no planejamento anual.'}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => handleCloseComposer()}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isDirty}
                    onClick={() =>
                      reset(
                        editingEvent
                          ? toCalendarEventFormValues(editingEvent)
                          : buildCreateModeFormValues(defaultCreateDate),
                      )
                    }
                  >
                    Restaurar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="min-w-40">
                    <Plus className="size-4" />
                    {submitButtonLabel}
                  </Button>
                </div>
              </div>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  )
}
