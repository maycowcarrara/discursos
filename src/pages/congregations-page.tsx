import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronLeft,
  ChevronRight,
  MapPinned,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
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
import {
  useCongregationsQuery,
  useCreateCongregationMutation,
  useDeleteCongregationMutation,
  useUpdateCongregationMutation,
} from '@/hooks/use-congregations'
import {
  defaultCongregationFormValues,
  toCongregationFormValues,
  type CongregationFormValues,
} from '@/services/firestore/congregations-service'

const congregationFormSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome da congregacao.'),
  address: z.string().trim().min(5, 'Informe o endereco completo.'),
  city: z.string().trim().min(2, 'Informe a cidade.'),
  state: z
    .string()
    .trim()
    .length(2, 'Use a sigla do estado com 2 caracteres.'),
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, 'Informe um CEP valido.'),
  mapsUrl: z.string().trim().url('Informe uma URL valida do Google Maps.'),
  meetingDay: z.string().trim().min(3, 'Informe o dia da reuniao.'),
  meetingTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Informe o horario no formato HH:MM.'),
  notes: z.string().trim(),
  isLocal: z.boolean(),
})

const pageSize = 6
const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

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

  return 'Nao foi possivel concluir a operacao em congregacoes.'
}

function getFeedbackContainerClassName(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function formatUpdatedAt(value: Date) {
  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function CongregationsPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const congregationsQuery = useCongregationsQuery()
  const createCongregationMutation = useCreateCongregationMutation()
  const updateCongregationMutation = useUpdateCongregationMutation()
  const deleteCongregationMutation = useDeleteCongregationMutation()

  const editingCongregation =
    congregationsQuery.data?.find((item) => item.id === editingId) ?? null

  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setValue,
    control,
  } = useForm<CongregationFormValues>({
    resolver: zodResolver(congregationFormSchema),
    defaultValues: defaultCongregationFormValues,
  })

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredCongregations = (congregationsQuery.data ?? []).filter((item) => {
    if (normalizedSearch.length === 0) {
      return true
    }

    const searchableContent = [
      item.name,
      item.city,
      item.state,
      item.address,
      item.meetingDay,
    ]
      .join(' ')
      .toLowerCase()

    return searchableContent.includes(normalizedSearch)
  })

  const totalPages = Math.max(1, Math.ceil(filteredCongregations.length / pageSize))
  const visiblePage = Math.min(currentPage, totalPages)
  const pageStartIndex = (visiblePage - 1) * pageSize
  const paginatedCongregations = filteredCongregations.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  )
  const totalCongregations = congregationsQuery.data?.length ?? 0
  const localCongregationsCount =
    congregationsQuery.data?.filter((item) => item.isLocal).length ?? 0
  const partnerCongregationsCount = totalCongregations - localCongregationsCount
  const isSubmitting =
    createCongregationMutation.isPending ||
    updateCongregationMutation.isPending ||
    deleteCongregationMutation.isPending
  const formModeLabel = editingCongregation ? 'Editar congregacao' : 'Nova congregacao'
  const actorName = user?.displayName ?? user?.email ?? null
  const isLocal =
    useWatch({
      control,
      name: 'isLocal',
    }) ?? false

  const submitHandler = handleSubmit(async (values) => {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessao expirou. Entre novamente para continuar.',
      })
      return
    }

    setFeedback(null)

    try {
      if (editingCongregation) {
        await updateCongregationMutation.mutateAsync({
          id: editingCongregation.id,
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: 'Congregacao atualizada com sucesso.',
        })
      } else {
        await createCongregationMutation.mutateAsync({
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: 'Congregacao criada com sucesso.',
        })
      }

      setEditingId(null)
      reset(defaultCongregationFormValues)
      setCurrentPage(1)
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  })

  async function handleDelete(id: string, name: string) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessao expirou. Entre novamente para continuar.',
      })
      return
    }

    const confirmed = window.confirm(
      `Excluir ${name} da base ativa? A congregacao sera removida apenas das listagens ativas.`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      await deleteCongregationMutation.mutateAsync({
        id,
        actorUid: user.uid,
        actorName,
      })

      if (editingId === id) {
        setEditingId(null)
        reset(defaultCongregationFormValues)
      }

      setFeedback({
        tone: 'success',
        message: 'Congregacao excluida da base ativa com sucesso.',
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
    reset(defaultCongregationFormValues)
  }

  function handleStartEdit(id: string) {
    const congregation = congregationsQuery.data?.find((item) => item.id === id)

    setEditingId(id)
    setFeedback(null)

    if (congregation) {
      reset(toCongregationFormValues(congregation))
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-3xl">Congregacoes</CardTitle>
              <CardDescription className="mt-2 text-base">
                A Fase 4 entrega o CRUD completo de `congregations` com busca,
                paginacao local economica e exclusao segura via `isActive`.
              </CardDescription>
            </div>
            <Button onClick={handleStartCreate} disabled={isSubmitting}>
              <Plus className="size-4" />
              Nova congregacao
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge className="bg-primary/10 text-primary">
              {totalCongregations} ativas
            </Badge>
            <Badge variant="outline">{localCongregationsCount} locais</Badge>
            <Badge variant="outline">{partnerCongregationsCount} parceiras</Badge>
            <span>Busca e paginacao acontecem no cliente para evitar leituras extras.</span>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{formModeLabel}</CardTitle>
                <CardDescription>
                  {editingCongregation
                    ? 'Atualize os dados oficiais da congregacao sem sair do schema aprovado.'
                    : 'Cadastre uma nova congregacao com os campos oficiais da Fase 4.'}
                </CardDescription>
              </div>
              {editingCongregation ? (
                <Button variant="outline" onClick={handleStartCreate} disabled={isSubmitting}>
                  Cancelar edicao
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={submitHandler}>
              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Nome</span>
                  <Input
                    placeholder="Ex.: Congregacao Central"
                    {...register('name')}
                  />
                  {errors.name ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.name.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Endereco</span>
                  <Input
                    placeholder="Rua, numero e bairro"
                    {...register('address')}
                  />
                  {errors.address ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.address.message}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-[1.2fr_110px_150px]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Cidade</span>
                    <Input placeholder="Palmas" {...register('city')} />
                    {errors.city ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.city.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">UF</span>
                    <Input
                      maxLength={2}
                      placeholder="TO"
                      className="uppercase"
                      {...register('state')}
                    />
                    {errors.state ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.state.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">CEP</span>
                    <Input
                      inputMode="numeric"
                      placeholder="77000-000"
                      {...register('zipCode')}
                    />
                    {errors.zipCode ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.zipCode.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Link do Google Maps
                  </span>
                  <Input
                    placeholder="https://maps.google.com/..."
                    {...register('mapsUrl')}
                  />
                  {errors.mapsUrl ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.mapsUrl.message}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Dia da reuniao
                    </span>
                    <Input placeholder="Sabado" {...register('meetingDay')} />
                    {errors.meetingDay ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.meetingDay.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Horario</span>
                    <Input type="time" {...register('meetingTime')} />
                    {errors.meetingTime ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.meetingTime.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Tipo da congregacao
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                        isLocal
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isLocal', true, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <p className="font-medium text-foreground">Local</p>
                      <p className="mt-1 leading-6">Faz parte da propria agenda.</p>
                    </button>
                    <button
                      type="button"
                      className={`rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                        !isLocal
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() =>
                        setValue('isLocal', false, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <p className="font-medium text-foreground">Parceira</p>
                      <p className="mt-1 leading-6">Usada para visitantes e trocas.</p>
                    </button>
                  </div>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Observacoes</span>
                  <Textarea
                    placeholder="Anote detalhes operacionais relevantes."
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

              {congregationsQuery.isError ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {getErrorMessage(congregationsQuery.error)}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {editingCongregation
                    ? `Ultima atualizacao em ${formatUpdatedAt(
                        editingCongregation.updatedAt.toDate(),
                      )}.`
                    : 'Os dados salvos entram imediatamente na base ativa do Firestore.'}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isDirty}
                    onClick={() => reset(toCongregationFormValues(editingCongregation))}
                  >
                    Restaurar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Plus className="size-4" />
                    {editingCongregation ? 'Salvar alteracoes' : 'Cadastrar congregacao'}
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
                <CardTitle className="text-2xl">Base ativa</CardTitle>
                <CardDescription>
                  Lista oficial das congregacoes ativas, com busca local e pagina atual.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                <span>Pagina</span>
                <span className="font-medium text-foreground">
                  {visiblePage}/{totalPages}
                </span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-11"
                  placeholder="Buscar por nome, cidade, UF ou dia..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className={selectClassName}>
                <span>
                  {filteredCongregations.length} resultado(s) de {totalCongregations}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {congregationsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-44 animate-pulse rounded-[22px] border border-border/70 bg-background"
                  />
                ))}
              </div>
            ) : null}

            {!congregationsQuery.isLoading &&
            !congregationsQuery.isError &&
            filteredCongregations.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
                {totalCongregations > 0
                  ? 'Nenhuma congregacao corresponde aos filtros aplicados.'
                  : 'Nenhuma congregacao ativa encontrada ainda no Firestore.'}
              </div>
            ) : null}

            {!congregationsQuery.isLoading &&
            !congregationsQuery.isError &&
            paginatedCongregations.length > 0 ? (
              <div className="space-y-3">
                {paginatedCongregations.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-border/70 bg-background p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <MapPinned className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-foreground">
                              {item.name}
                            </h3>
                            <Badge>{item.isLocal ? 'Local' : 'Parceira'}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.city}/{item.state} • {item.zipCode}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.meetingDay} • {item.meetingTime}
                          </p>
                          <p className="mt-4 text-sm leading-6 text-muted-foreground">
                            {item.address}
                          </p>
                          {item.notes ? (
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                              {item.notes}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <a
                              href={item.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              Abrir no Maps
                            </a>
                            <span>
                              Atualizado em {formatUpdatedAt(item.updatedAt.toDate())}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <Button
                          variant="outline"
                          onClick={() => handleStartEdit(item.id)}
                          disabled={isSubmitting}
                        >
                          <PencilLine className="size-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={isSubmitting}
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

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Exibindo {paginatedCongregations.length} item(ns) nesta pagina.
              </p>
              <div className="flex gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  disabled={visiblePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={visiblePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  Proxima
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
