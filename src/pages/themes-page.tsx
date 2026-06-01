import { zodResolver } from '@hookform/resolvers/zod'
import { BookText, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateThemeMutation,
  useDeleteThemeMutation,
  useThemesManagementQuery,
  useUpdateThemeMutation,
} from '@/hooks/use-themes'
import {
  defaultThemeFormValues,
  toThemeFormValues,
  type ThemeFormValues,
} from '@/services/firestore/themes-service'

const themeFormSchema = z.object({
  number: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Informe um número inteiro válido.')
    .refine((value) => Number.parseInt(value, 10) > 0, {
      message: 'Use um número maior que zero.',
    }),
  title: z.string().trim().min(3, 'Informe o título oficial do tema.'),
  notes: z.string().trim(),
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

  return 'Não foi possível concluir a operação em temas.'
}

function getFeedbackContainerClassName(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function formatUpdatedAt(value: Date) {
  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function ThemesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const themesQuery = useThemesManagementQuery()
  const createThemeMutation = useCreateThemeMutation()
  const updateThemeMutation = useUpdateThemeMutation()
  const deleteThemeMutation = useDeleteThemeMutation()

  const editingTheme = themesQuery.data?.find((item) => item.id === editingId) ?? null

  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setValue,
    control,
  } = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: defaultThemeFormValues,
  })

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredThemes = (themesQuery.data ?? []).filter((item) => {
    if (normalizedSearch.length === 0) {
      return true
    }

    const searchableContent = [item.number, item.title, item.notes]
      .join(' ')
      .toLowerCase()

    return searchableContent.includes(normalizedSearch)
  })

  const totalThemes = themesQuery.data?.length ?? 0
  const activeThemesCount =
    themesQuery.data?.filter((item) => item.isActive).length ?? 0
  const inactiveThemesCount = totalThemes - activeThemesCount
  const isSubmitting =
    createThemeMutation.isPending ||
    updateThemeMutation.isPending ||
    deleteThemeMutation.isPending
  const formModeLabel = editingTheme ? 'Editar tema' : 'Novo tema'
  const actorName = user?.displayName ?? user?.email ?? null
  const isActive =
    useWatch({
      control,
      name: 'isActive',
    }) ?? true

  const submitHandler = handleSubmit(async (values) => {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      if (editingTheme) {
        await updateThemeMutation.mutateAsync({
          id: editingTheme.id,
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: 'Tema atualizado com sucesso.',
        })
      } else {
        await createThemeMutation.mutateAsync({
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: 'Tema criado com sucesso.',
        })
      }

      setEditingId(null)
      reset(defaultThemeFormValues)
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  })

  async function handleDelete(id: string, title: string) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessão expirou. Entre novamente para continuar.',
      })
      return
    }

    const confirmed = window.confirm(
      `Excluir o tema "${title}" da base ativa? Ele permanecerá no histórico, mas sairá das listas operacionais.`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      await deleteThemeMutation.mutateAsync({
        id,
        actorUid: user.uid,
        actorName,
      })

      if (editingId === id) {
        setEditingId(null)
        reset(defaultThemeFormValues)
      }

      setFeedback({
        tone: 'success',
        message: 'Tema removido da base ativa com sucesso.',
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
    reset(defaultThemeFormValues)
  }

  function handleStartEdit(id: string) {
    const theme = themesQuery.data?.find((item) => item.id === id)

    setEditingId(id)
    setFeedback(null)

    if (theme) {
      reset(toThemeFormValues(theme))
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catálogo"
        title="Temas"
        description="Mantenha o catálogo oficial enxuto, fácil de buscar e pronto para as próximas designações."
        actions={
          <Button onClick={handleStartCreate} disabled={isSubmitting}>
            <Plus className="size-4" />
            Novo tema
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryStat
          label="No catálogo"
          value={String(totalThemes)}
          detail="Total de temas cadastrados."
          icon={BookText}
          tone="blue"
        />
        <SummaryStat
          label="Ativos"
          value={String(activeThemesCount)}
          detail="Disponíveis para novas designações."
          icon={Plus}
          tone="green"
        />
        <SummaryStat
          label="Inativos"
          value={String(inactiveThemesCount)}
          detail="Preservados para histórico e revisão."
          icon={PencilLine}
          tone="slate"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{formModeLabel}</CardTitle>
                <CardDescription>
                  {editingTheme
                    ? 'Atualize número, título, status e observações nesta mesma tela.'
                    : 'Cadastre um novo tema com número único e título claro.'}
                </CardDescription>
              </div>
              {editingTheme ? (
                <Button variant="outline" onClick={handleStartCreate} disabled={isSubmitting}>
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={submitHandler}>
              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Número</span>
                  <Input
                    inputMode="numeric"
                    placeholder="Ex.: 84"
                    {...register('number')}
                  />
                  {errors.number ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.number.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Título</span>
                  <Input
                    placeholder="Ex.: Como fortalecer a família"
                    {...register('title')}
                  />
                  {errors.title ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.title.message}
                    </p>
                  ) : null}
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-[16px] border px-4 py-3.5 text-left text-sm transition ${
                        isActive
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isActive', true, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <p className="font-medium text-foreground">Ativo</p>
                      <p className="mt-1 leading-6">
                        Disponível para novas designações.
                      </p>
                    </button>
                    <button
                      type="button"
                      className={`rounded-[16px] border px-4 py-3.5 text-left text-sm transition ${
                        !isActive
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isActive', false, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <p className="font-medium text-foreground">Inativo</p>
                      <p className="mt-1 leading-6">
                        Sai da operação atual, mas continua acessível para histórico e reativação.
                      </p>
                    </button>
                  </div>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Observações</span>
                  <Textarea
                    placeholder="Anote detalhes úteis sobre o uso deste tema."
                    {...register('notes')}
                  />
                  {errors.notes ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.notes.message}
                    </p>
                  ) : null}
                </label>
              </div>

              {feedback ? (
                <div className={getFeedbackContainerClassName(feedback.tone)}>
                  {feedback.message}
                </div>
              ) : null}

              {themesQuery.isError ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {getErrorMessage(themesQuery.error)}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {editingTheme
                    ? `Última atualização em ${formatUpdatedAt(
                        editingTheme.updatedAt.toDate(),
                      )}.`
                    : 'Os temas inativos continuam preservados para consultas futuras.'}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isDirty}
                    onClick={() => reset(toThemeFormValues(editingTheme))}
                  >
                    Restaurar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Plus className="size-4" />
                    {editingTheme ? 'Salvar alterações' : 'Salvar tema'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-2xl">Catálogo oficial</CardTitle>
                <CardDescription>
                  Lista completa, ordenada por número e pronta para busca rápida.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                <span>Ordenação</span>
                <span className="font-medium text-foreground">Número ascendente</span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-11"
                  placeholder="Buscar por número, título ou observação..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="flex h-11 items-center rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm">
                {filteredThemes.length} resultado(s) de {totalThemes}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {themesQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-40 animate-pulse rounded-[18px] border border-border/70 bg-background"
                  />
                ))}
              </div>
            ) : null}

            {!themesQuery.isLoading &&
            !themesQuery.isError &&
            filteredThemes.length === 0 ? (
              <EmptyState
                title={
                  totalThemes > 0
                    ? 'Nenhum tema encontrado'
                    : 'Ainda não há temas cadastrados'
                }
                description={
                  totalThemes > 0
                    ? 'Ajuste a busca para localizar o tema desejado.'
                    : 'Cadastre o primeiro tema para começar a montar o catálogo.'
                }
              />
            ) : null}

            {!themesQuery.isLoading &&
            !themesQuery.isError &&
            filteredThemes.length > 0 ? (
              <div className="space-y-3">
                {filteredThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="rounded-[18px] border border-border/70 bg-background p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <BookText className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={theme.isActive ? 'default' : 'outline'}>
                              {theme.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              Tema {theme.number}
                            </p>
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-foreground">
                            {theme.title}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {theme.notes || 'Sem observações cadastradas.'}
                          </p>
                          <p className="mt-4 text-xs text-muted-foreground">
                            Atualizado em {formatUpdatedAt(theme.updatedAt.toDate())}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <Button
                          variant="outline"
                          onClick={() => handleStartEdit(theme.id)}
                          disabled={isSubmitting}
                        >
                          <PencilLine className="size-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(theme.id, theme.title)}
                          disabled={isSubmitting || !theme.isActive}
                        >
                          <Trash2 className="size-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
