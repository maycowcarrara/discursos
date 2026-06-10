import { zodResolver } from '@hookform/resolvers/zod'
import {
  BookText,
  CheckCircle2,
  CircleOff,
  FileUp,
  FolderTree,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { EmptyState } from '@/components/app/empty-state'
import { MetadataChip } from '@/components/app/metadata-chip'
import { PageHeader } from '@/components/app/page-header'
import { PageHeaderStat } from '@/components/app/page-header-stat'
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
import {
  useCreateThemeMutation,
  useDeleteThemeMutation,
  useImportThemesMutation,
  useThemesManagementQuery,
  useUpdateThemeMutation,
} from '@/hooks/use-themes'
import {
  getThemeCategoryLabel,
  themeCategoryOptions,
  themeCategoryValues,
  type ThemeCategory,
} from '@/lib/theme-categories'
import {
  defaultThemeFormValues,
  toThemeFormValues,
  type ThemeFormValues,
} from '@/services/firestore/themes-service'
import {
  buildThemeImportPreview,
  getThemeImportCategorySummary,
  type ParsedThemeCatalog,
} from '@/utils/theme-catalog-import'

const selectClassName =
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

const themeFormSchema = z.object({
  number: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Informe um número inteiro válido.')
    .refine((value) => Number.parseInt(value, 10) > 0, {
      message: 'Use um número maior que zero.',
    }),
  title: z.string().trim().min(3, 'Informe o título oficial do tema.'),
  category: z.enum(themeCategoryValues, {
    error: 'Selecione a categoria do tema.',
  }),
  notes: z.string().trim(),
  isActive: z.boolean(),
})

type ThemeCategoryFilter = 'all' | ThemeCategory

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
    return 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function formatUpdatedAt(value: Date) {
  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function buildImportResultMessage(result: {
  createdCount: number
  updatedCount: number
  unchangedCount: number
}) {
  return `Importação concluída: ${result.createdCount} novo(s), ${result.updatedCount} atualizado(s) e ${result.unchangedCount} sem mudanças.`
}

export function ThemesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ThemeCategoryFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isParsingImport, setIsParsingImport] = useState(false)
  const [importCatalog, setImportCatalog] = useState<ParsedThemeCatalog | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const themesQuery = useThemesManagementQuery()
  const createThemeMutation = useCreateThemeMutation()
  const updateThemeMutation = useUpdateThemeMutation()
  const deleteThemeMutation = useDeleteThemeMutation()
  const importThemesMutation = useImportThemesMutation()

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
  const selectedCategory =
    useWatch({
      control,
      name: 'category',
    }) ?? defaultThemeFormValues.category
  const isActive =
    useWatch({
      control,
      name: 'isActive',
    }) ?? true

  const filteredThemes = (themesQuery.data ?? []).filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

    if (!matchesCategory) {
      return false
    }

    if (normalizedSearch.length === 0) {
      return true
    }

    const searchableContent = [
      item.number,
      item.title,
      item.notes,
      getThemeCategoryLabel(item.category),
    ]
      .join(' ')
      .toLowerCase()

    return searchableContent.includes(normalizedSearch)
  })

  const totalThemes = themesQuery.data?.length ?? 0
  const activeThemesCount =
    themesQuery.data?.filter((item) => item.isActive).length ?? 0
  const inactiveThemesCount = totalThemes - activeThemesCount
  const categoriesCount = new Set((themesQuery.data ?? []).map((item) => item.category)).size
  const isSubmitting =
    createThemeMutation.isPending ||
    updateThemeMutation.isPending ||
    deleteThemeMutation.isPending ||
    importThemesMutation.isPending ||
    isParsingImport
  const formModeLabel = editingTheme ? 'Editar tema' : 'Novo tema'
  const actorName = user?.displayName ?? user?.email ?? null
  const importPreview =
    importCatalog && themesQuery.data
      ? buildThemeImportPreview(importCatalog.items, themesQuery.data)
      : null

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

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      return
    }

    setImportError(null)
    setImportCatalog(null)
    setImportFileName(file.name)
    setIsParsingImport(true)

    try {
      const { parseThemeCatalogPdf } = await import('@/utils/theme-catalog-pdf')
      const parsedCatalog = await parseThemeCatalogPdf(file)
      setImportCatalog(parsedCatalog)
    } catch (error) {
      setImportError(getErrorMessage(error))
    } finally {
      setIsParsingImport(false)
      event.target.value = ''
    }
  }

  async function handleConfirmImport() {
    if (!user || !importCatalog) {
      return
    }

    setImportError(null)
    setFeedback(null)

    try {
      const result = await importThemesMutation.mutateAsync({
        items: importCatalog.items,
        actorUid: user.uid,
        actorName,
        sourceLabel: importCatalog.sourceLabel,
      })

      setFeedback({
        tone: 'success',
        message: buildImportResultMessage(result),
      })
      setIsImportModalOpen(false)
      setImportCatalog(null)
      setImportFileName('')
      setImportError(null)
    } catch (error) {
      setImportError(getErrorMessage(error))
    }
  }

  function handleCloseImportModal() {
    if (isParsingImport || importThemesMutation.isPending) {
      return
    }

    setIsImportModalOpen(false)
    setImportCatalog(null)
    setImportFileName('')
    setImportError(null)
  }

  function handleImportModalOpenChange(open: boolean) {
    if (open) {
      setIsImportModalOpen(true)
      return
    }

    handleCloseImportModal()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catálogo"
        title="Temas"
        description="Mantenha o catálogo oficial enxuto, categorizado e pronto para as próximas designações."
        actions={
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            disabled={isSubmitting}
          >
            <FileUp className="size-4" />
            Importar PDF
          </Button>
        }
        meta={
          <>
            <PageHeaderStat
              label="No catálogo"
              value={String(totalThemes)}
              icon={BookText}
              tone="blue"
            />
            <PageHeaderStat
              label="Ativos"
              value={String(activeThemesCount)}
              icon={Plus}
              tone="green"
            />
            <PageHeaderStat
              label="Categorias"
              value={String(categoriesCount)}
              icon={FolderTree}
              tone="amber"
            />
            <PageHeaderStat
              label="Inativos"
              value={String(inactiveThemesCount)}
              icon={PencilLine}
              tone="slate"
            />
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{formModeLabel}</CardTitle>
                <CardDescription>
                  {editingTheme
                    ? 'Atualize número, categoria, status e observações nesta mesma tela.'
                    : 'Cadastre um novo tema com número único, categoria oficial e título claro.'}
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

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Categoria</span>
                  <select className={selectClassName} {...register('category')}>
                    {themeCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <MetadataChip
                    label="Categoria atual"
                    value={getThemeCategoryLabel(selectedCategory)}
                  />
                  {errors.category ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.category.message}
                    </p>
                  ) : null}
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isActive', true, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${
                          isActive
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <CheckCircle2 className="size-4" />
                      </span>
                      <span>
                        <span className="block font-medium text-foreground">Ativo</span>
                        <span className="block text-xs leading-5">Disponível para designar.</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        !isActive
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isActive', false, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${
                          !isActive
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        <CircleOff className="size-4" />
                      </span>
                      <span>
                        <span className="block font-medium text-foreground">Inativo</span>
                        <span className="block text-xs leading-5">Preservado no histórico.</span>
                      </span>
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
                  Lista completa, ordenada por número e pronta para busca rápida por categoria.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <span>Ordenação</span>
                <span className="font-medium text-foreground">Número ascendente</span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_240px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-11"
                  placeholder="Buscar por número, título, categoria ou observação..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <select
                className={selectClassName}
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as ThemeCategoryFilter)
                }
              >
                <option value="all">Todas as categorias</option>
                {themeCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                    className="h-40 animate-pulse rounded-xl border border-border bg-background"
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
                    ? 'Ajuste a busca ou o filtro de categoria para localizar o tema desejado.'
                    : 'Cadastre o primeiro tema ou importe o PDF oficial para começar a montar o catálogo.'
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
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <BookText className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <Badge variant={theme.isActive ? 'default' : 'outline'}>
                              {theme.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <MetadataChip
                              label="Tema"
                              value={String(theme.number)}
                            />
                            <MetadataChip
                              label="Categoria"
                              value={getThemeCategoryLabel(theme.category)}
                            />
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-foreground">
                            {theme.title}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {theme.notes || 'Sem observações cadastradas.'}
                          </p>
                          <div className="mt-4">
                            <MetadataChip
                              label="Atualizado"
                              value={formatUpdatedAt(theme.updatedAt.toDate())}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-row lg:items-center">
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

      <Modal open={isImportModalOpen} onOpenChange={handleImportModalOpenChange}>
        <ModalContent className="max-w-3xl">
          <ModalHeader>
            <ModalTitle>Importar catálogo oficial de temas</ModalTitle>
            <ModalDescription>
              Selecione o PDF `S-99a_T` para criar os temas ausentes e atualizar títulos,
              categorias e status dos que já existem.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Arquivo PDF</span>
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleImportFileChange}
                disabled={isSubmitting}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                A reimportação funciona em modo de atualização por número do tema.
              </p>
            </label>

            {isParsingImport ? (
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Lendo o PDF e classificando os temas por categoria...
              </div>
            ) : null}

            {importError ? (
              <div className={getFeedbackContainerClassName('error')}>{importError}</div>
            ) : null}

            {importCatalog && importPreview ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      No PDF
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {importCatalog.items.length}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      temas lidos de {importFileName || importCatalog.sourceLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Importação
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {importPreview.createCount + importPreview.updateCount}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {importPreview.createCount} novo(s) e {importPreview.updateCount} atualização(ões)
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Sem mudança
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {importPreview.unchangedCount}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      temas já alinhados com o PDF
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Categorias encontradas
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {importPreview.categoryBreakdown.map((item) => (
                      <Badge key={item.category} variant="outline">
                        {getThemeImportCategorySummary(item.category, item.count)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </ModalBody>

          <ModalFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              O importador preserva observações já existentes e faz atualização por número do tema.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={handleCloseImportModal} disabled={isSubmitting}>
                Fechar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isSubmitting || !importCatalog || !importPreview}
              >
                <FileUp className="size-4" />
                Importar catálogo
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
