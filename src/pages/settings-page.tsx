import {
  BellRing,
  CalendarDays,
  Clock3,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { CompactEntityCard } from '@/components/app/compact-entity-card'
import { EntityPageShell } from '@/components/app/entity-page-shell'
import { EmptyState } from '@/components/app/empty-state'
import { MetadataChip } from '@/components/app/metadata-chip'
import { MetricStrip } from '@/components/app/metric-strip'
import { PageHeader } from '@/components/app/page-header'
import { AdminUsersCard } from '@/components/settings/admin-users-card'
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
import { useToast } from '@/components/ui/use-toast'
import {
  useCalendarSettingsQuery,
  useSaveCalendarSettingsMutation,
} from '@/hooks/use-app-settings'
import { useRecentAuditLogsQuery } from '@/hooks/use-audit-logs'
import { useNotificationsByStatusQuery } from '@/hooks/use-notifications'
import {
  defaultCalendarSettingsValues,
  toCalendarSettingsFormValues,
  type CalendarSettingsFormValues,
} from '@/services/firestore/settings-service'
import type { CalendarSyncRunStatus } from '@/types/firestore'
import { formatTimestampDate } from '@/utils/calendar-events'
import {
  auditActionLabels,
  auditEntityTypeLabels,
  getAuditActionClassName,
  getNotificationStatusClassName,
  notificationProviderLabels,
  notificationStatusLabels,
  notificationTypeLabels,
} from '@/utils/operations-display'

const calendarSettingsFormSchema = z
  .object({
    enabled: z.boolean(),
    calendarId: z.string().trim(),
    defaultStartTime: z
      .string()
      .trim()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Use o formato HH:mm no horário padrão.',
      ),
    defaultDurationMinutes: z
      .number({
        error: 'Informe a duração em minutos.',
      })
      .int('Use minutos inteiros.')
      .min(15, 'Use pelo menos 15 minutos.')
      .max(360, 'Use até 360 minutos.'),
  })
  .superRefine((values, context) => {
    if (values.enabled && values.calendarId.length < 3) {
      context.addIssue({
        code: 'custom',
        message: 'Informe o Calendar ID para ativar a integração.',
        path: ['calendarId'],
      })
    }
  })

function formatUpdatedAt(updatedAt: Date) {
  return updatedAt.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível carregar as configurações agora.'
}

function getCalendarRunStatusLabel(status?: CalendarSyncRunStatus | null) {
  if (status === 'running') {
    return 'Em andamento'
  }

  if (status === 'success') {
    return 'Sincronização ok'
  }

  if (status === 'error') {
    return 'Com falha'
  }

  return 'Aguardando'
}

function getCalendarRunStatusClassName(status?: CalendarSyncRunStatus | null) {
  if (status === 'success') {
    return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
  }

  if (status === 'error') {
    return 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200'
  }

  if (status === 'running') {
    return 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
  }

  return 'bg-primary/10 text-primary'
}

export function SettingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const calendarSettingsQuery = useCalendarSettingsQuery()
  const saveCalendarSettingsMutation = useSaveCalendarSettingsMutation()
  const pendingNotificationsQuery = useNotificationsByStatusQuery('pending', 6)
  const failedNotificationsQuery = useNotificationsByStatusQuery('failed', 4)
  const auditLogsQuery = useRecentAuditLogsQuery(6)

  const {
    formState: { errors: calendarErrors, isDirty: isCalendarDirty },
    handleSubmit: handleCalendarSubmit,
    register: registerCalendar,
    reset: resetCalendar,
  } = useForm<CalendarSettingsFormValues>({
    resolver: zodResolver(calendarSettingsFormSchema),
    defaultValues: defaultCalendarSettingsValues,
  })

  useEffect(() => {
    resetCalendar(toCalendarSettingsFormValues(calendarSettingsQuery.data))
  }, [calendarSettingsQuery.data, resetCalendar])

  const submitCalendarHandler = handleCalendarSubmit(async (values) => {
    if (!user) {
      toast.error('Sua sessão expirou. Entre novamente para continuar.')
      return
    }

    try {
      await saveCalendarSettingsMutation.mutateAsync({
        ...values,
        actorUid: user.uid,
        actorName: user.displayName ?? user.email ?? null,
      })
      toast.success('Ajustes do Google Calendar salvos com sucesso.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  const persistedCalendarSettings = calendarSettingsQuery.data
  const notificationsError =
    pendingNotificationsQuery.error ?? failedNotificationsQuery.error
  const pendingNotifications = pendingNotificationsQuery.data ?? []
  const failedNotifications = failedNotificationsQuery.data ?? []
  const recentAuditLogs = auditLogsQuery.data ?? []
  const isCalendarLoading = calendarSettingsQuery.isLoading
  const isCalendarSaving = saveCalendarSettingsMutation.isPending
  const currentYear = new Date().getFullYear()

  return (
    <EntityPageShell>
      <PageHeader
        eyebrow="Ajustes do sistema"
        title="Configurações"
        description="Mantenha a integração da agenda alinhada, administre acessos e acompanhe os últimos envios e movimentos administrativos."
      />

      <MetricStrip
        items={[
          {
            label: 'Agenda',
            value: persistedCalendarSettings?.enabled ? 'Ativa' : 'Desligada',
            detail: persistedCalendarSettings?.calendarId
              ? persistedCalendarSettings.calendarId
              : 'Sem calendário remoto',
            icon: CalendarDays,
            tone: persistedCalendarSettings?.enabled ? 'green' : 'slate',
          },
          {
            label: 'Último ciclo',
            value: getCalendarRunStatusLabel(
              persistedCalendarSettings?.lastSyncStatus,
            ),
            detail:
              persistedCalendarSettings?.lastSyncMessage ??
              'Aguardando retorno da automação',
            icon: Clock3,
            tone:
              persistedCalendarSettings?.lastSyncStatus === 'error'
                ? 'amber'
                : persistedCalendarSettings?.lastSyncStatus === 'success'
                  ? 'green'
                  : 'blue',
          },
          {
            label: 'Fila',
            value: `${pendingNotifications.length}/${failedNotifications.length}`,
            detail: 'Pendentes / falhas',
            icon: BellRing,
            tone:
              pendingNotifications.length > 0 || failedNotifications.length > 0
                ? 'amber'
                : 'green',
          },
          {
            label: 'Ano atual',
            value: String(currentYear),
            detail: 'Usado automaticamente no painel',
            icon: CalendarDays,
            tone: 'blue',
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-5">
          <AdminUsersCard />

          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Integração Google Calendar</CardTitle>
                    <CardDescription>
                      Use o calendário remoto das publicações.
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  className={getCalendarRunStatusClassName(
                    persistedCalendarSettings?.lastSyncStatus,
                  )}
                >
                  {persistedCalendarSettings?.enabled
                    ? getCalendarRunStatusLabel(
                        persistedCalendarSettings.lastSyncStatus,
                      )
                    : 'Integração desligada'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={submitCalendarHandler}>
                <label className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-border text-primary"
                    {...registerCalendar('enabled')}
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">
                      Ativar sincronização com o Google Calendar
                    </span>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Quando ligado, a automação processa os envios manuais.
                    </p>
                  </div>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">
                      Calendar ID
                    </span>
                    <Input
                      placeholder="ex.: sua-congregacao@group.calendar.google.com"
                      {...registerCalendar('calendarId')}
                    />
                    {calendarErrors.calendarId ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {calendarErrors.calendarId.message}
                      </p>
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground">
                        Compartilhe com o e-mail da integração antes de ativar.
                        Se trocar o calendário, peça nova sincronização.
                      </p>
                    )}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Horário padrão
                    </span>
                    <Input
                      placeholder="19:30"
                      inputMode="numeric"
                      {...registerCalendar('defaultStartTime')}
                    />
                    {calendarErrors.defaultStartTime ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {calendarErrors.defaultStartTime.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Duração padrão (min)
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      {...registerCalendar('defaultDurationMinutes', {
                        valueAsNumber: true,
                      })}
                    />
                    {calendarErrors.defaultDurationMinutes ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {calendarErrors.defaultDurationMinutes.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                {calendarSettingsQuery.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(calendarSettingsQuery.error)}
                  </div>
                ) : null}

                {saveCalendarSettingsMutation.isSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Ajustes do Google Calendar salvos com sucesso.
                  </div>
                ) : null}

                {saveCalendarSettingsMutation.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(saveCalendarSettingsMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-3">
                  <MetadataChip
                    label="Último ciclo"
                    tone={
                      persistedCalendarSettings?.lastSyncStatus === 'error'
                        ? 'warning'
                        : persistedCalendarSettings?.lastSyncStatus === 'success'
                          ? 'success'
                          : 'pending'
                    }
                    value={
                      persistedCalendarSettings?.lastSyncMessage
                        ? persistedCalendarSettings.lastSyncMessage
                        : 'Aguardando retorno da automação'
                    }
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {persistedCalendarSettings
                      ? `Última atualização em ${formatUpdatedAt(
                          persistedCalendarSettings.updatedAt.toDate(),
                        )}.`
                      : 'A integração ainda não foi configurada.'}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isCalendarLoading || isCalendarSaving}
                      onClick={() =>
                        resetCalendar(
                          toCalendarSettingsFormValues(calendarSettingsQuery.data),
                        )
                      }
                    >
                      Restaurar valores
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isCalendarLoading ||
                        isCalendarSaving ||
                        (!isCalendarDirty && !!persistedCalendarSettings)
                      }
                    >
                      <Save className="size-4" />
                      {persistedCalendarSettings
                        ? 'Salvar integração'
                        : 'Criar integração'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Fila de notificações</CardTitle>
              <CardDescription>
                Acompanhe o que ainda será enviado e o que precisa de nova tentativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {getErrorMessage(notificationsError)}
                </div>
              ) : null}

              {pendingNotificationsQuery.isLoading || failedNotificationsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-xl border border-border bg-background"
                    />
                  ))}
                </div>
              ) : null}

              {!pendingNotificationsQuery.isLoading &&
              !failedNotificationsQuery.isLoading &&
              !notificationsError &&
              pendingNotifications.length === 0 &&
              failedNotifications.length === 0 ? (
                <EmptyState
                  title="Sem movimentação na fila"
                  description="Não há notificações pendentes nem falhas recentes neste momento."
                />
              ) : null}

              {!pendingNotificationsQuery.isLoading &&
              !failedNotificationsQuery.isLoading &&
              !notificationsError &&
              (pendingNotifications.length > 0 || failedNotifications.length > 0) ? (
                <div className="space-y-3">
                  {[...pendingNotifications, ...failedNotifications].map((notification) => (
                    <CompactEntityCard
                      key={notification.id}
                      className="bg-background"
                      leading={
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BellRing className="size-4" />
                        </div>
                      }
                      title={notificationTypeLabels[notification.type]}
                      subtitle={notification.recipientEmail}
                      badges={
                        <Badge
                          className={getNotificationStatusClassName(notification.status)}
                        >
                          {notificationStatusLabels[notification.status]}
                        </Badge>
                      }
                      metadata={
                        <>
                        <MetadataChip
                          label="Agendado"
                          value={formatTimestampDate(notification.scheduledFor)}
                        />
                        <MetadataChip
                          label="Canal"
                          value={notificationProviderLabels[notification.provider]}
                        />
                        <MetadataChip
                          label="Tentativas"
                          value={String(notification.retryCount)}
                        />
                        </>
                      }
                      alert={
                        notification.errorMessage ? (
                          <p className="text-sm leading-5 text-rose-700 dark:text-rose-200">
                            {notification.errorMessage}
                          </p>
                        ) : null
                      }
                    />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Atividade recente</CardTitle>
              <CardDescription>
                Últimos movimentos administrativos registrados no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditLogsQuery.isError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {getErrorMessage(auditLogsQuery.error)}
                </div>
              ) : null}

              {auditLogsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-xl border border-border bg-background"
                    />
                  ))}
                </div>
              ) : null}

              {!auditLogsQuery.isLoading &&
              !auditLogsQuery.isError &&
              recentAuditLogs.length === 0 ? (
                <EmptyState
                  title="Sem atividade recente"
                  description="Os próximos ajustes e confirmações aparecerão aqui."
                />
              ) : null}

              {!auditLogsQuery.isLoading &&
              !auditLogsQuery.isError &&
              recentAuditLogs.length > 0 ? (
                <div className="space-y-3">
                  {recentAuditLogs.map((auditLog) => (
                    <CompactEntityCard
                      key={auditLog.id}
                      className="bg-background"
                      leading={
                        <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <ShieldCheck className="size-4" />
                        </div>
                      }
                      title={auditEntityTypeLabels[auditLog.entityType]}
                      subtitle={auditLog.actorName ?? 'Administrador'}
                      badges={
                        <Badge className={getAuditActionClassName(auditLog.action)}>
                          {auditActionLabels[auditLog.action]}
                        </Badge>
                      }
                      metadata={
                        <>
                        <MetadataChip
                          label="Em"
                          value={formatTimestampDate(auditLog.createdAt)}
                        />
                        <MetadataChip label="Registro" value={auditLog.entityId} />
                        </>
                      }
                    />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </EntityPageShell>
  )
}
