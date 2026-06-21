import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  PencilLine,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
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

type LocalCongregationFormValues = CongregationFormValues & {
  isLocal: true
}

type ExternalCongregationFormValues = CongregationFormValues & {
  isLocal: false
}

const commonCongregationFormFields = {
  name: z.string().trim().min(3, 'Informe o nome da congregação.'),
  address: z.string().trim().min(5, 'Informe o endereço completo.'),
  city: z.string().trim().min(2, 'Informe a cidade.'),
  state: z
    .string()
    .trim()
    .length(2, 'Use a sigla do estado com 2 caracteres.'),
  mapsUrl: z.string().trim().url('Informe uma URL válida do Google Maps.'),
  meetingDay: z.string().trim().min(3, 'Informe o dia da reunião.'),
  meetingTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Informe o horário no formato HH:MM.'),
  publicTalkCoordinatorName: z.string().trim(),
  publicTalkCoordinatorPhone: z
    .string()
    .trim()
    .refine(validateOptionalPhone, 'Informe um telefone válido.'),
  publicTalkCoordinatorEmail: z
    .string()
    .trim()
    .refine(validateOptionalEmail, 'Informe um e-mail válido.'),
  notes: z.string().trim(),
}

const localCongregationFormSchema = z.object({
  ...commonCongregationFormFields,
  isLocal: z.literal(true),
})

const externalCongregationFormSchema = z.object({
  ...commonCongregationFormFields,
  isLocal: z.literal(false),
})

const pageSize = 6
const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'
const brazilStateOptions = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const
const meetingDayOptions = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const

const emailValidationSchema = z.string().email()

function validateOptionalEmail(value: string) {
  return value.length === 0 || emailValidationSchema.safeParse(value).success
}

function validateOptionalPhone(value: string) {
  return value.length === 0 || value.replace(/\D/g, '').length >= 8
}

const defaultLocalCongregationFormValues: LocalCongregationFormValues = {
  ...defaultCongregationFormValues,
  isLocal: true,
}

const defaultExternalCongregationFormValues: ExternalCongregationFormValues = {
  ...defaultCongregationFormValues,
  isLocal: false,
}

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

  return 'Não foi possível concluir a operação em congregações.'
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

function getCoordinatorName(congregation: {
  publicTalkCoordinatorContact: string
  publicTalkCoordinatorName: string
}) {
  return congregation.publicTalkCoordinatorName || congregation.publicTalkCoordinatorContact
}

function getOptionalMetadataValue(value: string, fallback: string) {
  return value.trim() || fallback
}

function toLocalCongregationFormValues(
  congregation: Parameters<typeof toCongregationFormValues>[0],
): LocalCongregationFormValues {
  if (!congregation) {
    return defaultLocalCongregationFormValues
  }

  return {
    ...toCongregationFormValues(congregation),
    isLocal: true,
  }
}

function toExternalCongregationFormValues(
  congregation: Parameters<typeof toCongregationFormValues>[0],
): ExternalCongregationFormValues {
  return {
    ...toCongregationFormValues(congregation),
    isLocal: false,
  }
}

export function CongregationsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingExternalId, setEditingExternalId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [isLocalCardExpanded, setIsLocalCardExpanded] = useState(true)
  const [hasInitializedLocalCard, setHasInitializedLocalCard] = useState(false)

  const congregationsQuery = useCongregationsQuery()
  const createCongregationMutation = useCreateCongregationMutation()
  const updateCongregationMutation = useUpdateCongregationMutation()
  const deleteCongregationMutation = useDeleteCongregationMutation()

  const activeCongregations = congregationsQuery.data ?? []
  const localCongregations = activeCongregations.filter((item) => item.isLocal)
  const localCongregation = localCongregations[0] ?? null
  const externalCongregations = activeCongregations.filter((item) => !item.isLocal)
  const editingExternalCongregation =
    externalCongregations.find((item) => item.id === editingExternalId) ?? null

  const localFormValues = useMemo(
    () => toLocalCongregationFormValues(localCongregation),
    [localCongregation],
  )

  const {
    formState: { errors: localErrors, isDirty: isLocalFormDirty },
    handleSubmit: handleLocalSubmit,
    register: registerLocal,
    reset: resetLocalForm,
  } = useForm<LocalCongregationFormValues>({
    resolver: zodResolver(localCongregationFormSchema),
    values: localFormValues,
  })

  const {
    formState: { errors: externalErrors, isDirty: isExternalFormDirty },
    handleSubmit: handleExternalSubmit,
    register: registerExternal,
    reset: resetExternalForm,
  } = useForm<ExternalCongregationFormValues>({
    resolver: zodResolver(externalCongregationFormSchema),
    defaultValues: defaultExternalCongregationFormValues,
  })

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredExternalCongregations = externalCongregations.filter((item) => {
    if (normalizedSearch.length === 0) {
      return true
    }

    const searchableContent = [
      item.name,
      item.city,
      item.state,
      item.address,
      item.meetingDay,
      getCoordinatorName(item),
      item.publicTalkCoordinatorPhone,
      item.publicTalkCoordinatorEmail,
    ]
      .join(' ')
      .toLowerCase()

    return searchableContent.includes(normalizedSearch)
  })

  const totalPages = Math.max(
    1,
    Math.ceil(filteredExternalCongregations.length / pageSize),
  )
  const visiblePage = Math.min(currentPage, totalPages)
  const pageStartIndex = (visiblePage - 1) * pageSize
  const paginatedExternalCongregations = filteredExternalCongregations.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  )
  const totalCongregations = activeCongregations.length
  const totalExternalCongregations = externalCongregations.length
  const isSubmitting =
    createCongregationMutation.isPending ||
    updateCongregationMutation.isPending ||
    deleteCongregationMutation.isPending
  const actorName = user?.displayName ?? user?.email ?? null

  const resolvedIsLocalCardExpanded = hasInitializedLocalCard
    ? isLocalCardExpanded
    : !localCongregation

  function handleToggleLocalCard() {
    setHasInitializedLocalCard(true)
    setIsLocalCardExpanded((currentValue) => !currentValue)
  }

  const submitLocalHandler = handleLocalSubmit(async (values) => {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    const localValues: LocalCongregationFormValues = {
      ...values,
      isLocal: true,
    }

    setFeedback(null)

    try {
      if (localCongregation) {
        await updateCongregationMutation.mutateAsync({
          id: localCongregation.id,
          ...localValues,
          actorUid: user.uid,
          actorName,
        })
      } else {
        await createCongregationMutation.mutateAsync({
          ...localValues,
          actorUid: user.uid,
          actorName,
        })
      }

      resetLocalForm(localValues)
      const message = 'Congregação local salva com sucesso.'
      setFeedback({
        tone: 'success',
        message,
      })
      toast.success(message)
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  })

  const submitExternalHandler = handleExternalSubmit(async (values) => {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    const externalValues: ExternalCongregationFormValues = {
      ...values,
      isLocal: false,
    }

    setFeedback(null)

    try {
      if (editingExternalCongregation) {
        await updateCongregationMutation.mutateAsync({
          id: editingExternalCongregation.id,
          ...externalValues,
          actorUid: user.uid,
          actorName,
        })

        const message = 'Congregação externa atualizada com sucesso.'
        setFeedback({
          tone: 'success',
          message,
        })
        toast.success(message)
      } else {
        await createCongregationMutation.mutateAsync({
          ...externalValues,
          actorUid: user.uid,
          actorName,
        })

        const message = 'Congregação externa criada com sucesso.'
        setFeedback({
          tone: 'success',
          message,
        })
        toast.success(message)
      }

      setEditingExternalId(null)
      resetExternalForm(defaultExternalCongregationFormValues)
      setCurrentPage(1)
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  })

  async function handleDeleteExternal(id: string, name: string) {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    const confirmed = window.confirm(
      `Excluir ${name} da base ativa? A congregação externa será removida apenas das listagens ativas.`,
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

      if (editingExternalId === id) {
        setEditingExternalId(null)
        resetExternalForm(defaultExternalCongregationFormValues)
      }

      const message = 'Congregação externa excluída da base ativa com sucesso.'
      setFeedback({
        tone: 'success',
        message,
      })
      toast.success(message)
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  }

  function handleStartCreateExternal() {
    setEditingExternalId(null)
    setFeedback(null)
    resetExternalForm(defaultExternalCongregationFormValues)
  }

  function handleStartEditExternal(id: string) {
    const congregation = externalCongregations.find((item) => item.id === id)

    setEditingExternalId(id)
    setFeedback(null)

    if (congregation) {
      resetExternalForm(toExternalCongregationFormValues(congregation))
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cadastro"
        title="Congregações"
        description="Mantenha a base local fixa e cadastre separadamente as congregações externas usadas na operação."
        meta={
          <>
            <PageHeaderStat
              label="Externas"
              value={String(totalExternalCongregations)}
              icon={Users}
              tone="blue"
            />
            <PageHeaderStat
              label="Ativas"
              value={String(totalCongregations)}
              icon={MapPinned}
              tone="slate"
            />
          </>
        }
      />

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

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">
                  {editingExternalCongregation
                    ? 'Editar congregação externa'
                    : 'Nova congregação externa'}
                </CardTitle>
                <CardDescription>
                  {editingExternalCongregation
                    ? 'Atualize os dados da congregação externa sem mudar o tipo.'
                    : 'Cadastre apenas congregações parceiras ou externas usadas em visitantes e saídas.'}
                </CardDescription>
              </div>
              {editingExternalCongregation ? (
                <Button
                  variant="outline"
                  onClick={handleStartCreateExternal}
                  disabled={isSubmitting}
                >
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={submitExternalHandler}>
              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Nome</span>
                  <Input
                    placeholder="Ex.: Congregação Aureny"
                    {...registerExternal('name')}
                  />
                  {externalErrors.name ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {externalErrors.name.message}
                    </p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Endereço</span>
                  <Input
                    placeholder="Rua, número e bairro"
                    {...registerExternal('address')}
                  />
                  {externalErrors.address ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {externalErrors.address.message}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Cidade</span>
                    <Input placeholder="Palmas" {...registerExternal('city')} />
                    {externalErrors.city ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {externalErrors.city.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">UF</span>
                    <select className={selectClassName} {...registerExternal('state')}>
                      <option value="">Selecione</option>
                      {brazilStateOptions.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {externalErrors.state ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {externalErrors.state.message}
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
                    {...registerExternal('mapsUrl')}
                  />
                  {externalErrors.mapsUrl ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {externalErrors.mapsUrl.message}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      Dia da reunião
                    </span>
                    <select className={selectClassName} {...registerExternal('meetingDay')}>
                      <option value="">Selecione</option>
                      {meetingDayOptions.map((meetingDay) => (
                        <option key={meetingDay} value={meetingDay}>
                          {meetingDay}
                        </option>
                      ))}
                    </select>
                    {externalErrors.meetingDay ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {externalErrors.meetingDay.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Horário</span>
                    <Input type="time" {...registerExternal('meetingTime')} />
                    {externalErrors.meetingTime ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {externalErrors.meetingTime.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                <div className="rounded-2xl border border-border bg-muted/10 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-foreground">
                      Responsável pelo arranjo de discursos
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Campos opcionais para facilitar contato com a congregação.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Nome
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          opcional
                        </span>
                      </span>
                      <Input
                        placeholder="Ex.: João Silva"
                        {...registerExternal('publicTalkCoordinatorName')}
                      />
                      {externalErrors.publicTalkCoordinatorName ? (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {externalErrors.publicTalkCoordinatorName.message}
                        </p>
                      ) : null}
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">
                          Telefone
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            opcional
                          </span>
                        </span>
                        <Input
                          inputMode="tel"
                          placeholder="(63) 99999-0000"
                          {...registerExternal('publicTalkCoordinatorPhone')}
                        />
                        {externalErrors.publicTalkCoordinatorPhone ? (
                          <p className="text-sm text-rose-600 dark:text-rose-300">
                            {externalErrors.publicTalkCoordinatorPhone.message}
                          </p>
                        ) : null}
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">
                          E-mail
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            opcional
                          </span>
                        </span>
                        <Input
                          type="email"
                          placeholder="responsavel@exemplo.com"
                          {...registerExternal('publicTalkCoordinatorEmail')}
                        />
                        {externalErrors.publicTalkCoordinatorEmail ? (
                          <p className="text-sm text-rose-600 dark:text-rose-300">
                            {externalErrors.publicTalkCoordinatorEmail.message}
                          </p>
                        ) : null}
                      </label>
                    </div>
                  </div>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Observações</span>
                  <Textarea
                    placeholder="Anote detalhes úteis para visitantes e trocas."
                    {...registerExternal('notes')}
                  />
                  {externalErrors.notes ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {externalErrors.notes.message}
                    </p>
                  ) : null}
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {editingExternalCongregation
                    ? `Última atualização em ${formatUpdatedAt(
                        editingExternalCongregation.updatedAt.toDate(),
                      )}.`
                    : 'O cadastro será salvo automaticamente como congregação externa.'}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isExternalFormDirty}
                    onClick={() =>
                      resetExternalForm(
                        toExternalCongregationFormValues(editingExternalCongregation),
                      )
                    }
                  >
                    Restaurar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Plus className="size-4" />
                    {editingExternalCongregation
                      ? 'Salvar alterações'
                      : 'Salvar externa'}
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
                <CardTitle className="text-2xl">Congregações externas</CardTitle>
                <CardDescription>
                  Lista das parceiras ativas, com busca local e paginação simples.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <span>Página</span>
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
                  {filteredExternalCongregations.length} resultado(s) de{' '}
                  {totalExternalCongregations}
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
                    className="h-44 animate-pulse rounded-xl border border-border bg-background"
                  />
                ))}
              </div>
            ) : null}

            {!congregationsQuery.isLoading &&
            !congregationsQuery.isError &&
            filteredExternalCongregations.length === 0 ? (
              <EmptyState
                title={
                  totalExternalCongregations > 0
                    ? 'Nenhuma congregação externa encontrada'
                    : 'Ainda não há congregações externas'
                }
                description={
                  totalExternalCongregations > 0
                    ? 'Ajuste a busca para localizar a congregação desejada.'
                    : 'Cadastre a primeira externa para liberar visitantes e saídas.'
                }
              />
            ) : null}

            {!congregationsQuery.isLoading &&
            !congregationsQuery.isError &&
            paginatedExternalCongregations.length > 0 ? (
              <div className="space-y-3">
                {paginatedExternalCongregations.map((item) => {
                  const coordinatorName = getCoordinatorName(item)
                  const hasCoordinatorContact =
                    coordinatorName ||
                    item.publicTalkCoordinatorPhone ||
                    item.publicTalkCoordinatorEmail

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background p-4"
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
                            <Badge>Externa</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.city}/{item.state}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.meetingDay} • {item.meetingTime}
                          </p>
                          <p className="mt-4 text-sm leading-6 text-muted-foreground">
                            {item.address}
                          </p>
                          {hasCoordinatorContact ? (
                            <div className="mt-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Arranjo de discursos
                              </p>
                              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                                <MetadataChip
                                  label="Responsável"
                                  value={getOptionalMetadataValue(
                                    coordinatorName,
                                    'Sem nome',
                                  )}
                                  tone={coordinatorName ? 'default' : 'pending'}
                                />
                                <MetadataChip
                                  label="Telefone"
                                  value={getOptionalMetadataValue(
                                    item.publicTalkCoordinatorPhone,
                                    'Sem telefone',
                                  )}
                                  tone={
                                    item.publicTalkCoordinatorPhone
                                      ? 'default'
                                      : 'pending'
                                  }
                                />
                                <MetadataChip
                                  label="E-mail"
                                  value={getOptionalMetadataValue(
                                    item.publicTalkCoordinatorEmail,
                                    'Sem e-mail',
                                  )}
                                  tone={
                                    item.publicTalkCoordinatorEmail
                                      ? 'default'
                                      : 'pending'
                                  }
                                />
                              </div>
                            </div>
                          ) : null}
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
                          onClick={() => handleStartEditExternal(item.id)}
                          disabled={isSubmitting}
                        >
                          <PencilLine className="size-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteExternal(item.id, item.name)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="size-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Exibindo {paginatedExternalCongregations.length} item(ns) nesta página.
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
                  Próxima
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-2xl">Congregação local</CardTitle>
              <CardDescription>
                Cadastro fixo da congregação que recebe os discursos.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{localCongregation ? 'Base local ativa' : 'Cadastro necessário'}</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleToggleLocalCard}
                aria-expanded={resolvedIsLocalCardExpanded}
              >
                {resolvedIsLocalCardExpanded ? 'Recolher' : 'Expandir'}
                <ChevronDown
                  className={`size-4 transition-transform ${
                    resolvedIsLocalCardExpanded ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </div>
          </div>

          {!resolvedIsLocalCardExpanded ? (
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-3">
              {localCongregation ? (
                <>
                  <MetadataChip label="Base" value={localCongregation.name} />
                  <MetadataChip
                    label="Cidade"
                    value={`${localCongregation.city}/${localCongregation.state}`}
                  />
                  <MetadataChip
                    label="Reunião"
                    value={`${localCongregation.meetingDay}, ${localCongregation.meetingTime}`}
                  />
                  <MetadataChip
                    label="Responsável"
                    value={getOptionalMetadataValue(
                      getCoordinatorName(localCongregation),
                      'Não informado',
                    )}
                    tone={getCoordinatorName(localCongregation) ? 'default' : 'pending'}
                  />
                  <MetadataChip
                    label="Atualizada"
                    value={formatUpdatedAt(localCongregation.updatedAt.toDate())}
                  />
                </>
              ) : (
                <MetadataChip
                  label="Próximo passo"
                  tone="warning"
                  value="Cadastre a base local obrigatória"
                />
              )}
            </div>
          ) : null}
        </CardHeader>

        {resolvedIsLocalCardExpanded ? (
          <CardContent>
            <form className="space-y-5" onSubmit={submitLocalHandler}>
              <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="grid gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Nome</span>
                    <Input
                      placeholder="Ex.: Congregação Central"
                      {...registerLocal('name')}
                    />
                    {localErrors.name ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {localErrors.name.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Endereço</span>
                    <Input
                      placeholder="Rua, número e bairro"
                      {...registerLocal('address')}
                    />
                    {localErrors.address ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {localErrors.address.message}
                      </p>
                    ) : null}
                  </label>

                  <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Cidade</span>
                      <Input placeholder="Palmas" {...registerLocal('city')} />
                      {localErrors.city ? (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {localErrors.city.message}
                        </p>
                      ) : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">UF</span>
                      <select className={selectClassName} {...registerLocal('state')}>
                        <option value="">Selecione</option>
                        {brazilStateOptions.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      {localErrors.state ? (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {localErrors.state.message}
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
                      {...registerLocal('mapsUrl')}
                    />
                    {localErrors.mapsUrl ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {localErrors.mapsUrl.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                <div className="grid content-start gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Dia da reunião
                      </span>
                      <select className={selectClassName} {...registerLocal('meetingDay')}>
                        <option value="">Selecione</option>
                        {meetingDayOptions.map((meetingDay) => (
                          <option key={meetingDay} value={meetingDay}>
                            {meetingDay}
                          </option>
                        ))}
                      </select>
                      {localErrors.meetingDay ? (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {localErrors.meetingDay.message}
                        </p>
                      ) : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Horário</span>
                      <Input type="time" {...registerLocal('meetingTime')} />
                      {localErrors.meetingTime ? (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {localErrors.meetingTime.message}
                        </p>
                      ) : null}
                    </label>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/10 p-4">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-foreground">
                        Responsável pelo arranjo de discursos
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Campos opcionais para facilitar contato na operação.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">
                          Nome
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            opcional
                          </span>
                        </span>
                        <Input
                          placeholder="Ex.: João Silva"
                          {...registerLocal('publicTalkCoordinatorName')}
                        />
                        {localErrors.publicTalkCoordinatorName ? (
                          <p className="text-sm text-rose-600 dark:text-rose-300">
                            {localErrors.publicTalkCoordinatorName.message}
                          </p>
                        ) : null}
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-foreground">
                            Telefone
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              opcional
                            </span>
                          </span>
                          <Input
                            inputMode="tel"
                            placeholder="(63) 99999-0000"
                            {...registerLocal('publicTalkCoordinatorPhone')}
                          />
                          {localErrors.publicTalkCoordinatorPhone ? (
                            <p className="text-sm text-rose-600 dark:text-rose-300">
                              {localErrors.publicTalkCoordinatorPhone.message}
                            </p>
                          ) : null}
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-foreground">
                            E-mail
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              opcional
                            </span>
                          </span>
                          <Input
                            type="email"
                            placeholder="responsavel@exemplo.com"
                            {...registerLocal('publicTalkCoordinatorEmail')}
                          />
                          {localErrors.publicTalkCoordinatorEmail ? (
                            <p className="text-sm text-rose-600 dark:text-rose-300">
                              {localErrors.publicTalkCoordinatorEmail.message}
                            </p>
                          ) : null}
                        </label>
                      </div>
                    </div>
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Observações</span>
                    <Textarea
                      placeholder="Anote detalhes fixos da base local."
                      {...registerLocal('notes')}
                    />
                    {localErrors.notes ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {localErrors.notes.message}
                      </p>
                    ) : null}
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {localCongregation
                    ? `Última atualização em ${formatUpdatedAt(
                        localCongregation.updatedAt.toDate(),
                      )}.`
                    : 'Preencha estes dados para criar a base local fixa da programação.'}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isLocalFormDirty}
                    onClick={() => resetLocalForm(localFormValues)}
                  >
                    Restaurar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="size-4" />
                    Salvar base local
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}
