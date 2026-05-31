import { zodResolver } from '@hookform/resolvers/zod'
import { BellRing, Save, Settings2, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAuth } from '@/components/auth/use-auth'
import { useRecentAuditLogsQuery } from '@/hooks/use-audit-logs'
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
import { useAppSettingsQuery, useSaveAppSettingsMutation } from '@/hooks/use-app-settings'
import { useNotificationsByStatusQuery } from '@/hooks/use-notifications'
import {
  defaultAppSettingsValues,
  toAppSettingsFormValues,
  type AppSettingsFormValues,
} from '@/services/firestore/settings-service'
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
      invalid_type_error: 'Informe um ano valido.',
    })
    .int('Informe um ano inteiro.')
    .min(2024, 'Use um ano a partir de 2024.')
    .max(2100, 'Use um ano ate 2100.'),
  locale: z.string().trim().min(2, 'Informe o locale.'),
  timezone: z.string().trim().min(3, 'Informe o timezone.'),
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

export function SettingsPage() {
  const { user } = useAuth()
  const appSettingsQuery = useAppSettingsQuery()
  const saveAppSettingsMutation = useSaveAppSettingsMutation()
  const pendingNotificationsQuery = useNotificationsByStatusQuery('pending', 6)
  const failedNotificationsQuery = useNotificationsByStatusQuery('failed', 4)
  const auditLogsQuery = useRecentAuditLogsQuery(6)

  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsFormSchema),
    defaultValues: defaultAppSettingsValues,
  })

  useEffect(() => {
    reset(toAppSettingsFormValues(appSettingsQuery.data))
  }, [appSettingsQuery.data, reset])

  const submitHandler = handleSubmit(async (values) => {
    if (!user) {
      return
    }

    await saveAppSettingsMutation.mutateAsync({
      ...values,
      actorUid: user.uid,
    })
  })

  const persistedSettings = appSettingsQuery.data
  const isSaving = saveAppSettingsMutation.isPending
  const isLoading = appSettingsQuery.isLoading
  const hasError = appSettingsQuery.isError
  const notificationsError =
    pendingNotificationsQuery.error ?? failedNotificationsQuery.error
  const pendingNotifications = pendingNotificationsQuery.data ?? []
  const failedNotifications = failedNotificationsQuery.data ?? []
  const recentAuditLogs = auditLogsQuery.data ?? []

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
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
            <form className="space-y-5" onSubmit={submitHandler}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Nome da organizacao
                  </span>
                  <Input
                    placeholder="Ex.: Congregacao Central"
                    {...register('organizationName')}
                  />
                  {errors.organizationName ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.organizationName.message}
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
                    {...register('defaultYear', {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.defaultYear ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.defaultYear.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Locale</span>
                  <Input placeholder="pt-BR" {...register('locale')} />
                  {errors.locale ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.locale.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Timezone
                  </span>
                  <Input
                    placeholder="America/Sao_Paulo"
                    {...register('timezone')}
                  />
                  {errors.timezone ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.timezone.message}
                    </p>
                  ) : null}
                </label>
              </div>

              {hasError ? (
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
                    disabled={isLoading || isSaving}
                    onClick={() =>
                      reset(toAppSettingsFormValues(appSettingsQuery.data))
                    }
                  >
                    Restaurar valores
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || isSaving || (!isDirty && !!persistedSettings)}
                  >
                    <Save className="size-4" />
                    {persistedSettings ? 'Salvar configuracao' : 'Criar configuracao inicial'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Escopo entregue</CardTitle>
              <CardDescription>
                A fundacao do Firestore foi concluida na Fase 3 e a Fase 4 abriu
                o primeiro CRUD operacional completo.
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
                Escrita inicial segura em
                <span className="font-medium text-foreground"> settings/app</span>.
              </div>
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                CRUD completo de
                <span className="font-medium text-foreground"> congregations</span>
                , com busca, paginacao e auditoria.
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
                  <CardTitle className="text-2xl">Fase 4 concluida</CardTitle>
                  <CardDescription>
                    Congregacoes agora ja operam com CRUD completo sobre o
                    Firestore oficial.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                A base da Fase 3 continua cobrindo `notifications` e `auditLogs`
                em leitura real.
              </p>
              <p>
                O proximo passo obrigatorio do plano passa a ser a Fase 5 com o
                CRUD de temas.
              </p>
              <p>
                `settings/notifications` e `settings/calendar` seguem reservados,
                sem campos novos inventados antes da etapa certa.
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
                    Leitura real da colecao `notifications`, sem ativar automacoes
                    fora da Fase 11.
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
