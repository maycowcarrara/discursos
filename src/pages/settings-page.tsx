import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Settings2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { useAppSettingsQuery, useSaveAppSettingsMutation } from '@/hooks/use-app-settings'
import {
  defaultAppSettingsValues,
  toAppSettingsFormValues,
  type AppSettingsFormValues,
} from '@/services/firestore/settings-service'

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

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-3xl">Configuracoes</CardTitle>
                <CardDescription className="mt-2 text-base">
                  A Fase 3 comecou pela base real de Firestore em
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
                A Fase 3 foi aberta com base reutilizavel, sem adiantar CRUDs da
                Fase 4.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                Tipagem oficial do Firestore para as colecoes aprovadas.
              </div>
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                Hooks React Query para leitura de congregacoes, temas, oradores e
                configuracoes.
              </div>
              <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
                Escrita inicial segura apenas em
                <span className="font-medium text-foreground"> settings/app</span>.
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
                  <CardTitle className="text-2xl">Proximo passo da fase</CardTitle>
                  <CardDescription>
                    Seguir a ordem oficial antes de CRUDs completos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                `congregations`, `themes` e `speakers` agora ja leem do Firestore.
              </p>
              <p>
                O proximo subpasso obrigatorio dentro da Fase 3 e tipar e conectar
                `calendarEvents`.
              </p>
              <p>
                `settings/notifications` e `settings/calendar` seguem reservados,
                sem campos novos inventados antes da etapa certa.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
