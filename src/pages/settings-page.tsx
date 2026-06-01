import { zodResolver } from '@hookform/resolvers/zod'
import {
  BellRing,
  CalendarDays,
  Save,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAuth } from '@/components/auth/use-auth'
import { AdminUsersCard } from '@/components/settings/admin-users-card'
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
import { useAppSettingsQuery, useCalendarSettingsQuery, useSaveAppSettingsMutation, useSaveCalendarSettingsMutation } from '@/hooks/use-app-settings'
import { useRecentAuditLogsQuery } from '@/hooks/use-audit-logs'
import { useNotificationsByStatusQuery } from '@/hooks/use-notifications'
import {
  currentDeliveredPhaseLabel,
  nextRequiredStepLabel,
} from '@/config/project-status'
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
  organizationName: z
    .string()
    .trim()
    .min(3, 'Informe o nome da organizacao.'),
  defaultYear: z
    .number({
      error: 'Informe um ano valido.',
    })
    .int('Informe um ano inteiro.')
    .min(2024, 'Use um ano a partir de 2024.')
    .max(2100, 'Use um ano ate 2100.'),
  locale: z.string().trim().min(2, 'Informe o locale.'),
  timezone: z.string().trim().min(3, 'Informe o timezone.'),
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
        'Use o formato HH:mm para o horario padrao.',
      ),
    defaultDurationMinutes: z
      .number({
        error: 'Informe a duracao em minutos.',
      })
      .int('Use minutos inteiros.')
      .min(15, 'Use pelo menos 15 minutos.')
      .max(360, 'Use ate 360 minutos.'),
  })
  .superRefine((values, context) => {
    if (values.enabled && values.calendarId.length < 3) {
      context.addIssue({
        code: 'custom',
        message: 'Informe o Calendar ID para habilitar a sincronizacao.',
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

  return 'Nao foi possivel carregar os dados do Firestore.'
}

function getCalendarRunStatusLabel(status?: CalendarSyncRunStatus | null) {
  if (status === 'running') {
    return 'Sincronizando agora'
  }

  if (status === 'success') {
    return 'Ultima sincronizacao ok'
  }

  if (status === 'error') {
    return 'Ultima sincronizacao com falha'
  }

  return 'Aguardando sincronizacao'
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
      return
    }

    await saveAppSettingsMutation.mutateAsync({
      ...values,
      actorUid: user.uid,
    })
  })

  const submitCalendarHandler = handleCalendarSubmit(async (values) => {
    if (!user) {
      return
    }

    await saveCalendarSettingsMutation.mutateAsync({
      ...values,
      actorUid: user.uid,
      actorName: user.displayName ?? user.email ?? null,
    })
  })

  const persistedSettings = appSettingsQuery.data
  const persistedCalendarSettings = calendarSettingsQuery.data
  const isAppSaving = saveAppSettingsMutation.isPending
  const isAppLoading = appSettingsQuery.isLoading
  const hasAppError = appSettingsQuery.isError
  const isCalendarSaving = saveCalendarSettingsMutation.isPending
  const isCalendarLoading = calendarSettingsQuery.isLoading
  const hasCalendarError = calendarSettingsQuery.isError
  const notificationsError =
    pendingNotificationsQuery.error ?? failedNotificationsQuery.error
  const pendingNotifications = pendingNotificationsQuery.data ?? []
  const failedNotifications = failedNotificationsQuery.data ?? []
  const recentAuditLogs = auditLogsQuery.data ?? []

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-3xl">Configuracoes</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    A Fase 3 consolidou a base real de Firestore em
                    <span className="font-medium text-foreground"> settings/app</span>,
                    sem inventar campos fora do schema oficial.
                  </CardDescription>
                </div>
                <Badge className="bg-primary/10 text-primary">
                  {persistedSettings ? 'Firestore ativo' : 'Aguardando primeiro salvamento'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <form className="space-y-5" onSubmit={submitAppHandler}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Nome da organizacao
                    </span>
                    <Input
                      placeholder="Ex.: Congregacao Central"
                      {...registerApp('organizationName')}
                    />
                    {appErrors.organizationName ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {appErrors.organizationName.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Ano padrao
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

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Locale</span>
                    <Input placeholder="pt-BR" {...registerApp('locale')} />
                    {appErrors.locale ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {appErrors.locale.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Timezone</span>
                    <Input
                      placeholder="America/Sao_Paulo"
                      {...registerApp('timezone')}
                    />
                    {appErrors.timezone ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {appErrors.timezone.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                {hasAppError ? (
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(appSettingsQuery.error)}
                  </div>
                ) : null}

                {saveAppSettingsMutation.isSuccess ? (
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Configuracao salva no Firestore com sucesso.
                  </div>
                ) : null}

                {saveAppSettingsMutation.isError ? (
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(saveAppSettingsMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {persistedSettings
                      ? `Ultima atualizacao em ${formatUpdatedAt(
                          persistedSettings.updatedAt.toDate(),
                        )}.`
                      : 'Ainda nao existe documento salvo em settings/app.'}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isAppLoading || isAppSaving}
                      onClick={() => resetApp(toAppSettingsFormValues(appSettingsQuery.data))}
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
                        ? 'Salvar configuracao'
                        : 'Criar configuracao inicial'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <AdminUsersCard />

          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Google Calendar</CardTitle>
                    <CardDescription className="mt-2 text-base">
                      Integracao entregue na Fase 12 com
                      <span className="font-medium text-foreground"> settings/calendar</span>,
                      sincronizacao por worker e fila leve no proprio
                      <span className="font-medium text-foreground"> calendarEvents</span>.
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
                    : 'Integracao desligada'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <form className="space-y-5" onSubmit={submitCalendarHandler}>
                <label className="flex items-start gap-3 rounded-[20px] border border-border/70 bg-background px-4 py-4">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-border text-primary"
                    {...registerCalendar('enabled')}
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">
                      Habilitar integracao com Google Calendar
                    </span>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Quando ligado, o worker pode processar publicacoes e
                      atualizacoes marcadas para a fila do Google Calendar.
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
                        Compartilhe esse calendario com o e-mail da service account
                        usada no worker antes de ativar a sincronizacao. Se voce
                        alterar esta configuracao depois, as designacoes operacionais
                        precisarao de novo clique em `Sincronizar com agenda`.
                      </p>
                    )}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Horario padrao
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
                      Duracao padrao (min)
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

                {hasCalendarError ? (
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(calendarSettingsQuery.error)}
                  </div>
                ) : null}

                {saveCalendarSettingsMutation.isSuccess ? (
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Configuracao do Google Calendar salva com sucesso.
                  </div>
                ) : null}

                {saveCalendarSettingsMutation.isError ? (
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {getErrorMessage(saveCalendarSettingsMutation.error)}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                    <p className="text-sm text-muted-foreground">Estado atual</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {persistedCalendarSettings?.enabled ? 'Ativo' : 'Desligado'}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                    <p className="text-sm text-muted-foreground">Ultimo ciclo</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {getCalendarRunStatusLabel(
                        persistedCalendarSettings?.lastSyncStatus,
                      )}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                    <p className="text-sm text-muted-foreground">Ultima execucao</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {persistedCalendarSettings?.lastSyncAt
                        ? formatTimestampDate(persistedCalendarSettings.lastSyncAt)
                        : 'Ainda nao executou'}
                    </p>
                  </div>
                </div>

                <div className="rounded-[18px] border border-dashed border-border/80 bg-background px-4 py-4 text-sm leading-6 text-muted-foreground">
                  {persistedCalendarSettings?.lastSyncMessage
                    ? persistedCalendarSettings.lastSyncMessage
                    : 'O worker verifica a fila periodicamente e atualiza o status global desta integracao.'}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {persistedCalendarSettings
                      ? `Ultima atualizacao em ${formatUpdatedAt(
                          persistedCalendarSettings.updatedAt.toDate(),
                        )}.`
                      : 'Ainda nao existe documento salvo em settings/calendar.'}
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
                        ? 'Salvar integracao'
                        : 'Criar configuracao da integracao'}
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
              <CardTitle className="text-2xl">Escopo entregue</CardTitle>
              <CardDescription>
                A fundacao do Firestore foi concluida na Fase 3 e a Fase 12
                foi entregue sem criar colecoes paralelas para integracao externa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                Tipagem oficial do Firestore para as colecoes aprovadas.
              </div>
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                Hooks React Query para leitura de agenda, designacoes,
                notificacoes, auditoria e configuracoes.
              </div>
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                Escrita segura em
                <span className="font-medium text-foreground"> settings/app</span> e
                <span className="font-medium text-foreground"> settings/calendar</span>.
              </div>
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                `calendarEvents` passa a concentrar o vinculo remoto e o estado
                de sincronizacao do Google Calendar.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Settings2 className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{currentDeliveredPhaseLabel}</CardTitle>
                  <CardDescription>
                    A Fase 12 esta concluida sobre a mesma infraestrutura de worker.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                `assignments` continua sincronizando a fila oficial de
                `notifications`, sem abrir colecoes paralelas para EmailJS.
              </p>
              <p>
                O proximo passo obrigatorio e
                <span className="font-medium text-foreground"> {nextRequiredStepLabel}</span>,
                com `settings/calendar` ativo e fila manual nas designacoes
                publicaveis.
              </p>
              <p>
                Os segredos seguem fora do frontend, enquanto o worker reutiliza
                a service account para Firestore e Google Calendar.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BellRing className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Fila de notificacoes</CardTitle>
                  <CardDescription>
                    Leitura real da colecao `notifications`, agora abastecida pela
                    automacao da Fase 11.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                  <p className="text-sm text-muted-foreground">Pendentes carregadas</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {pendingNotifications.length}
                  </p>
                </div>
                <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                  <p className="text-sm text-muted-foreground">Falhas carregadas</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {failedNotifications.length}
                  </p>
                </div>
              </div>

              {notificationsError ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {getErrorMessage(notificationsError)}
                </div>
              ) : null}

              {pendingNotificationsQuery.isLoading || failedNotificationsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-[18px] border border-border/70 bg-background"
                    />
                  ))}
                </div>
              ) : null}

              {!pendingNotificationsQuery.isLoading &&
              !failedNotificationsQuery.isLoading &&
              !notificationsError &&
              pendingNotifications.length === 0 &&
              failedNotifications.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-border/80 bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
                  Nenhuma notificacao pendente ou com falha encontrada ainda.
                </div>
              ) : null}

              {!pendingNotificationsQuery.isLoading &&
              !failedNotificationsQuery.isLoading &&
              !notificationsError &&
              (pendingNotifications.length > 0 || failedNotifications.length > 0) ? (
                <div className="space-y-3">
                  {[...pendingNotifications, ...failedNotifications].map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-[18px] border border-border/70 bg-background px-4 py-4"
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
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          Agendado: {formatTimestampDate(notification.scheduledFor)}
                        </span>
                        <span>Provider: {notificationProviderLabels[notification.provider]}</span>
                        <span>Retry: {notification.retryCount}</span>
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
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Auditoria recente</CardTitle>
                  <CardDescription>
                    Leitura real da colecao `auditLogs` para confirmar a trilha
                    append-only da V1.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditLogsQuery.isError ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {getErrorMessage(auditLogsQuery.error)}
                </div>
              ) : null}

              {auditLogsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-[18px] border border-border/70 bg-background"
                    />
                  ))}
                </div>
              ) : null}

              {!auditLogsQuery.isLoading &&
              !auditLogsQuery.isError &&
              recentAuditLogs.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-border/80 bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
                  Nenhum registro de auditoria encontrado ainda.
                </div>
              ) : null}

              {!auditLogsQuery.isLoading &&
              !auditLogsQuery.isError &&
              recentAuditLogs.length > 0 ? (
                <div className="space-y-3">
                  {recentAuditLogs.map((auditLog) => (
                    <div
                      key={auditLog.id}
                      className="rounded-[18px] border border-border/70 bg-background px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {auditEntityTypeLabels[auditLog.entityType]}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {auditLog.entityId}
                          </p>
                        </div>
                        <Badge className={getAuditActionClassName(auditLog.action)}>
                          {auditActionLabels[auditLog.action]}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Em: {formatTimestampDate(auditLog.createdAt)}</span>
                        <span>Actor: {auditLog.actorName ?? auditLog.actorUid}</span>
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
