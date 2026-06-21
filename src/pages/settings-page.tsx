import {
  BellRing,
  CalendarDays,
  Clock3,
  Save,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { EmptyState } from '@/components/app/empty-state'
import { MetadataChip } from '@/components/app/metadata-chip'
import { PageHeader } from '@/components/app/page-header'
import { PageHeaderStat } from '@/components/app/page-header-stat'
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
  useAppSettingsQuery,
  useCalendarSettingsQuery,
  useSaveAppSettingsMutation,
  useSaveCalendarSettingsMutation,
} from '@/hooks/use-app-settings'
import { useRecentAuditLogsQuery } from '@/hooks/use-audit-logs'
import { useNotificationsByStatusQuery } from '@/hooks/use-notifications'
import {
  defaultAppSettingsValues,
  defaultCalendarSettingsValues,
  toAppSettingsFormValues,
  toCalendarSettingsFormValues,
  type AppSettingsFormValues,
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

const appSettingsFormSchema = z.object({
  defaultYear: z
    .number({
      error: 'Informe um ano válido.',
    })
    .int('Informe um ano inteiro.')
    .min(2024, 'Use um ano a partir de 2024.')
    .max(2100, 'Use um ano até 2100.'),
})

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
  const appSettingsQuery = useAppSettingsQuery()
  const calendarSettingsQuery = useCalendarSettingsQuery()
  const saveAppSettingsMutation = useSaveAppSettingsMutation()
  const saveCalendarSettingsMutation = useSaveCalendarSettingsMutation()
  const pendingNotificationsQuery = useNotificationsByStatusQuery('pending', 6)
  const failedNotificationsQuery = useNotificationsByStatusQuery('failed', 4)
  const auditLogsQuery = useRecentAuditLogsQuery(6)

  const {
    formState: { errors: appErrors, isDirty: isAppDirty },
    handleSubmit: handleAppSubmit,
    register: registerApp,
    reset: resetApp,
  } = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsFormSchema),
    defaultValues: defaultAppSettingsValues,
  })
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
    resetApp(toAppSettingsFormValues(appSettingsQuery.data))
  }, [appSettingsQuery.data, resetApp])

  useEffect(() => {
    resetCalendar(toCalendarSettingsFormValues(calendarSettingsQuery.data))
  }, [calendarSettingsQuery.data, resetCalendar])

  const submitAppHandler = handleAppSubmit(async (values) => {
    if (!user) {
      toast.error('Sua sessão expirou. Entre novamente para continuar.')
      return
    }

    try {
      await saveAppSettingsMutation.mutateAsync({
        ...values,
        actorUid: user.uid,
      })
      toast.success('Ano padrão salvo com sucesso.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

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

  const persistedSettings = appSettingsQuery.data
  const persistedCalendarSettings = calendarSettingsQuery.data
  const notificationsError =
    pendingNotificationsQuery.error ?? failedNotificationsQuery.error
  const pendingNotifications = pendingNotificationsQuery.data ?? []
  const failedNotifications = failedNotificationsQuery.data ?? []
  const recentAuditLogs = auditLogsQuery.data ?? []
  const isAppLoading = appSettingsQuery.isLoading
  const isCalendarLoading = calendarSettingsQuery.isLoading
  const isAppSaving = saveAppSettingsMutation.isPending
  const isCalendarSaving = saveCalendarSettingsMutation.isPending

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Ajustes do sistema"
        title="Configurações"
        description="Defina a base do painel, mantenha a integração da agenda alinhada e acompanhe os últimos envios e movimentos administrativos."
        meta={
          <>
            <PageHeaderStat
              label="Painel"
              value={persistedSettings ? 'Configurado' : 'Pendente'}
              icon={Settings2}
              tone={persistedSettings ? 'green' : 'amber'}
            />
            <PageHeaderStat
              label="Agenda"
              value={persistedCalendarSettings?.enabled ? 'Ativa' : 'Desligada'}
              icon={CalendarDays}
              tone={persistedCalendarSettings?.enabled ? 'green' : 'slate'}
            />
            <PageHeaderStat
              label="Último ciclo"
              value={getCalendarRunStatusLabel(persistedCalendarSettings?.lastSyncStatus)}
              icon={Clock3}
              tone={
                persistedCalendarSettings?.lastSyncStatus === 'error'
                  ? 'amber'
                  : persistedCalendarSettings?.lastSyncStatus === 'success'
                    ? 'green'
                    : 'blue'
              }
            />
            <PageHeaderStat
              label="Pendentes"
              value={String(pendingNotifications.length)}
              icon={BellRing}
              tone={pendingNotifications.length > 0 ? 'amber' : 'green'}
            />
            <PageHeaderStat
              label="Falhas"
              value={String(failedNotifications.length)}
              icon={ShieldCheck}
              tone={failedNotifications.length > 0 ? 'amber' : 'green'}
            />
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Settings2 className="size-5" />
                </div>
                <div>
                  <CardTitle>Base do painel</CardTitle>
                  <CardDescription>
                    Defina o ano de referência usado como base nas telas administrativas.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form className="space-y-5" onSubmit={submitAppHandler}>
                <div className="grid gap-4 md:max-w-[18rem]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Ano padrão
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      {...registerApp('defaultYear', {
                        valueAsNumber: true,
                      })}
                    />
                    {appErrors.defaultYear ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {appErrors.defaultYear.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                {appSettingsQuery.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(appSettingsQuery.error)}
                  </div>
                ) : null}

                {saveAppSettingsMutation.isSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Ano padrão salvo com sucesso.
                  </div>
                ) : null}

                {saveAppSettingsMutation.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(saveAppSettingsMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {persistedSettings
                      ? `Última atualização em ${formatUpdatedAt(
                          persistedSettings.updatedAt.toDate(),
                        )}.`
                      : 'A configuração inicial ainda não foi salva.'}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isAppLoading || isAppSaving}
                      onClick={() =>
                        resetApp(toAppSettingsFormValues(appSettingsQuery.data))
                      }
                    >
                      Restaurar valores
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isAppLoading ||
                        isAppSaving ||
                        (!isAppDirty && !!persistedSettings)
                      }
                    >
                      <Save className="size-4" />
                      {persistedSettings
                        ? 'Salvar ajustes'
                        : 'Criar configuração inicial'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <AdminUsersCard />

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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

            <CardContent className="space-y-5">
              <form className="space-y-5" onSubmit={submitCalendarHandler}>
                <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3.5">
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
          <Card>
            <CardHeader>
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
                    <div
                      key={notification.id}
                      className="rounded-xl border border-border bg-background px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {notificationTypeLabels[notification.type]}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.recipientEmail}
                          </p>
                        </div>
                        <Badge
                          className={getNotificationStatusClassName(notification.status)}
                        >
                          {notificationStatusLabels[notification.status]}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-3">
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
                      </div>

                      {notification.errorMessage ? (
                        <p className="mt-3 text-sm leading-6 text-rose-700 dark:text-rose-200">
                          {notification.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
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
                    <div
                      key={auditLog.id}
                      className="rounded-xl border border-border bg-background px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {auditEntityTypeLabels[auditLog.entityType]}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {auditLog.actorName ?? 'Administrador'}
                          </p>
                        </div>
                        <Badge className={getAuditActionClassName(auditLog.action)}>
                          {auditActionLabels[auditLog.action]}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-3">
                        <MetadataChip
                          label="Em"
                          value={formatTimestampDate(auditLog.createdAt)}
                        />
                        <MetadataChip label="Registro" value={auditLog.entityId} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
