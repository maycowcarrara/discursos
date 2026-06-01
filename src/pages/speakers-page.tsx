import { zodResolver } from '@hookform/resolvers/zod'
import {
  Mail,
  Mic2,
  PencilLine,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { AvatarBadge } from '@/components/app/avatar-badge'
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
import { useCongregationsQuery } from '@/hooks/use-congregations'
import {
  useCreateSpeakerMutation,
  useDeleteSpeakerMutation,
  useSpeakersManagementQuery,
  useUpdateSpeakerMutation,
} from '@/hooks/use-speakers'
import { useThemesManagementQuery, useThemesQuery } from '@/hooks/use-themes'
import {
  defaultSpeakerFormValues,
  toSpeakerFormValues,
  type SpeakerFormValues,
} from '@/services/firestore/speakers-service'
import type { SpeakerStatus, SpeakerType } from '@/types/firestore'

const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

const speakerTypeLabels: Record<SpeakerType, string> = {
  local: 'Local',
  visitor: 'Visitante',
}

const speakerStatusLabels: Record<SpeakerStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  transferred: 'Transferido',
  unavailable: 'Indisponivel',
  vacation: 'Ferias',
}

const speakerTypeOptions: Array<{
  value: SpeakerType
  title: string
  description: string
}> = [
  {
    value: 'local',
    title: 'Local',
    description: 'Permanece na base principal de oradores da propria agenda.',
  },
  {
    value: 'visitor',
    title: 'Visitante',
    description: 'Representa oradores de congregacoes parceiras ou visitantes.',
  },
]

const speakerStatusOptions: Array<{
  value: SpeakerStatus
  title: string
  description: string
}> = [
  {
    value: 'active',
    title: 'Ativo',
    description: 'Fica disponivel na base operacional das proximas designacoes.',
  },
  {
    value: 'vacation',
    title: 'Ferias',
    description: 'Permanece cadastrado, mas exige periodo de indisponibilidade.',
  },
  {
    value: 'unavailable',
    title: 'Indisponivel',
    description: 'Mantem o cadastro e registra um intervalo bloqueado.',
  },
  {
    value: 'transferred',
    title: 'Transferido',
    description: 'Sai da base ativa, mas continua no cadastro para historico.',
  },
  {
    value: 'inactive',
    title: 'Inativo',
    description: 'Sai da operacao atual e pode ser reativado depois por edicao.',
  },
]

const speakerFilterOptions: Array<{
  value: 'all' | SpeakerStatus
  label: string
}> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'vacation', label: 'Ferias' },
  { value: 'unavailable', label: 'Indisponiveis' },
  { value: 'transferred', label: 'Transferidos' },
  { value: 'inactive', label: 'Inativos' },
]

const speakerFormSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome do orador.'),
    email: z.string().trim().email('Informe um e-mail valido.'),
    phone: z.string().trim().min(8, 'Informe um telefone valido.'),
    congregationId: z.string().trim().min(1, 'Selecione a congregacao.'),
    type: z.enum(['local', 'visitor']),
    themeIds: z
      .array(z.string().trim().min(1))
      .min(1, 'Selecione pelo menos um tema.'),
    status: z.enum(['active', 'vacation', 'unavailable', 'transferred', 'inactive']),
    unavailableStart: z.string().trim(),
    unavailableEnd: z.string().trim(),
    notes: z.string().trim(),
  })
  .superRefine((values, context) => {
    const needsUnavailableWindow =
      values.status === 'vacation' || values.status === 'unavailable'
    const hasStart = values.unavailableStart.length > 0
    const hasEnd = values.unavailableEnd.length > 0

    if (needsUnavailableWindow && !hasStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe a data inicial da indisponibilidade.',
        path: ['unavailableStart'],
      })
    }

    if (needsUnavailableWindow && !hasEnd) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe a data final da indisponibilidade.',
        path: ['unavailableEnd'],
      })
    }

    if (!needsUnavailableWindow && (hasStart || hasEnd)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Datas de indisponibilidade so valem para ferias ou indisponivel.',
        path: ['unavailableStart'],
      })
    }

    if (hasStart && hasEnd && values.unavailableStart > values.unavailableEnd) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A data final precisa ser igual ou posterior a data inicial.',
        path: ['unavailableEnd'],
      })
    }
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

  return 'Nao foi possivel concluir a operacao em oradores.'
}

function getFeedbackContainerClassName(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function getStatusBadgeClassName(status: SpeakerStatus) {
  if (status === 'active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (status === 'vacation') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'
  }

  if (status === 'unavailable') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  }

  return 'border-border/80 bg-muted text-muted-foreground'
}

function formatUpdatedAt(value: Date) {
  return value.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatDateRange(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString('pt-BR')
  const endLabel = end.toLocaleDateString('pt-BR')

  return `${startLabel} ate ${endLabel}`
}

export function SpeakersPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | SpeakerType>('all')
  const [congregationFilter, setCongregationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | SpeakerStatus>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const speakersQuery = useSpeakersManagementQuery()
  const congregationsQuery = useCongregationsQuery()
  const activeThemesQuery = useThemesQuery()
  const themesManagementQuery = useThemesManagementQuery()
  const createSpeakerMutation = useCreateSpeakerMutation()
  const updateSpeakerMutation = useUpdateSpeakerMutation()
  const deleteSpeakerMutation = useDeleteSpeakerMutation()

  const editingSpeaker = speakersQuery.data?.find((item) => item.id === editingId) ?? null
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setValue,
    control,
  } = useForm<SpeakerFormValues>({
    resolver: zodResolver(speakerFormSchema),
    defaultValues: defaultSpeakerFormValues,
  })

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const selectedType =
    useWatch({
      control,
      name: 'type',
    }) ?? 'visitor'
  const selectedStatus =
    useWatch({
      control,
      name: 'status',
    }) ?? 'active'
  const selectedThemeIds =
    useWatch({
      control,
      name: 'themeIds',
    }) ?? []
  const selectedCongregationId =
    useWatch({
      control,
      name: 'congregationId',
    }) ?? ''

  const availableCongregationOptions = (congregationsQuery.data ?? []).filter(
    (congregation) =>
      selectedType === 'local' ? congregation.isLocal : !congregation.isLocal,
  )
  const activeThemes = activeThemesQuery.data ?? []
  const themesById = new Map(
    (themesManagementQuery.data ?? []).map((theme) => [theme.id, theme]),
  )
  const inactiveSelectedThemes = selectedThemeIds
    .map((themeId) => themesById.get(themeId) ?? null)
    .filter(
      (theme): theme is NonNullable<typeof theme> =>
        theme !== null && !theme.isActive,
    )
  const missingSelectedThemeIds = selectedThemeIds.filter(
    (themeId) => !themesById.has(themeId),
  )
  const filteredSpeakers = (speakersQuery.data ?? []).filter((speaker) => {
    const matchesType = typeFilter === 'all' || speaker.type === typeFilter
    const matchesCongregation =
      congregationFilter === 'all' || speaker.congregationId === congregationFilter
    const matchesStatus = statusFilter === 'all' || speaker.status === statusFilter
    const searchableContent = [
      speaker.name,
      speaker.email,
      speaker.phone,
      speaker.congregationName ?? '',
    ]
      .join(' ')
      .toLowerCase()
    const matchesSearch =
      normalizedSearch.length === 0 || searchableContent.includes(normalizedSearch)

    return matchesType && matchesCongregation && matchesStatus && matchesSearch
  })

  const totalSpeakers = speakersQuery.data?.length ?? 0
  const operationalSpeakersCount =
    speakersQuery.data?.filter((item) => item.isActive).length ?? 0
  const temporarilyUnavailableCount =
    speakersQuery.data?.filter(
      (item) => item.status === 'vacation' || item.status === 'unavailable',
    ).length ?? 0
  const visitorsCount =
    speakersQuery.data?.filter((item) => item.type === 'visitor').length ?? 0
  const hasCongregationOptions = availableCongregationOptions.length > 0
  const hasThemeOptions = activeThemes.length > 0
  const isSubmitting =
    createSpeakerMutation.isPending ||
    updateSpeakerMutation.isPending ||
    deleteSpeakerMutation.isPending
  const formModeLabel = editingSpeaker ? 'Editar orador' : 'Novo orador'
  const actorName = user?.displayName ?? user?.email ?? null
  const needsUnavailableWindow =
    selectedStatus === 'vacation' || selectedStatus === 'unavailable'
  const hasInvalidSelectedThemes =
    inactiveSelectedThemes.length > 0 || missingSelectedThemeIds.length > 0

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
      if (editingSpeaker) {
        await updateSpeakerMutation.mutateAsync({
          id: editingSpeaker.id,
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: 'Orador atualizado com sucesso.',
        })
      } else {
        await createSpeakerMutation.mutateAsync({
          ...values,
          actorUid: user.uid,
          actorName,
        })

        setFeedback({
          tone: 'success',
          message: 'Orador criado com sucesso.',
        })
      }

      setEditingId(null)
      reset(defaultSpeakerFormValues)
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error),
      })
    }
  })

  useEffect(() => {
    if (selectedCongregationId.length === 0) {
      return
    }

    const selectedCongregationStillAllowed = availableCongregationOptions.some(
      (congregation) => congregation.id === selectedCongregationId,
    )

    if (!selectedCongregationStillAllowed) {
      setValue('congregationId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [availableCongregationOptions, selectedCongregationId, setValue])

  function handleToggleTheme(themeId: string) {
    const nextThemeIds = selectedThemeIds.includes(themeId)
      ? selectedThemeIds.filter((item) => item !== themeId)
      : [...selectedThemeIds, themeId]

    setValue('themeIds', nextThemeIds, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleRemoveTheme(themeId: string) {
    setValue(
      'themeIds',
      selectedThemeIds.filter((item) => item !== themeId),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    )
  }

  async function handleDelete(id: string, name: string) {
    if (!user) {
      setFeedback({
        tone: 'error',
        message: 'Sua sessao expirou. Entre novamente para continuar.',
      })
      return
    }

    const confirmed = window.confirm(
      `Remover ${name} da base ativa? O cadastro permanece para historico e futura reativacao.`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      await deleteSpeakerMutation.mutateAsync({
        id,
        actorUid: user.uid,
        actorName,
      })

      if (editingId === id) {
        setEditingId(null)
        reset(defaultSpeakerFormValues)
      }

      setFeedback({
        tone: 'success',
        message: 'Orador removido da base ativa com sucesso.',
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
    reset(defaultSpeakerFormValues)
  }

  function handleStartEdit(id: string) {
    const speaker = speakersQuery.data?.find((item) => item.id === id)

    setEditingId(id)
    setFeedback(null)

    if (speaker) {
      reset(toSpeakerFormValues(speaker))
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-3xl">Oradores</CardTitle>
              <CardDescription className="mt-2 text-base">
                A Fase 6 entrega o CRUD completo de `speakers` com temas
                multiplos, status operacional e filtros locais por congregacao e
                status.
              </CardDescription>
            </div>
            <Button onClick={handleStartCreate} disabled={isSubmitting}>
              <Plus className="size-4" />
              Novo orador
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge className="bg-primary/10 text-primary">
              {totalSpeakers} cadastrados
            </Badge>
            <Badge variant="outline">{operationalSpeakersCount} operacionais</Badge>
            <Badge variant="outline">
              {temporarilyUnavailableCount} com indisponibilidade
            </Badge>
            <Badge variant="outline">{visitorsCount} visitantes</Badge>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{formModeLabel}</CardTitle>
                <CardDescription>
                  {editingSpeaker
                    ? 'Atualize dados, status e temas sem sair do schema oficial.'
                    : 'Cadastre um orador com vinculo de congregacao, temas e status operacional.'}
                </CardDescription>
              </div>
              {editingSpeaker ? (
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
                  <Input placeholder="Ex.: Carlos Oliveira" {...register('name')} />
                  {errors.name ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.name.message}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">E-mail</span>
                    <Input
                      type="email"
                      placeholder="orador@exemplo.com"
                      {...register('email')}
                    />
                    {errors.email ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.email.message}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Telefone</span>
                    <Input
                      inputMode="tel"
                      placeholder="(63) 99999-0000"
                      {...register('phone')}
                    />
                    {errors.phone ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">
                        {errors.phone.message}
                      </p>
                    ) : null}
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Congregacao
                  </span>
                  <select className={selectClassName} {...register('congregationId')}>
                    <option value="">Selecione a congregacao</option>
                    {availableCongregationOptions.map((congregation) => (
                      <option key={congregation.id} value={congregation.id}>
                        {congregation.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {selectedType === 'local'
                      ? 'Oradores locais so podem ser vinculados a congregacoes locais.'
                      : 'Oradores visitantes so podem ser vinculados a congregacoes parceiras ou externas.'}
                  </p>
                  {errors.congregationId ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.congregationId.message}
                    </p>
                  ) : null}
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Tipo de orador
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {speakerTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                          selectedType === option.value
                            ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                            : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                        }`}
                        onClick={() =>
                          setValue('type', option.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <p className="font-medium text-foreground">{option.title}</p>
                        <p className="mt-1 leading-6">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {speakerStatusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                          selectedStatus === option.value
                            ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                            : 'border-border/80 bg-background text-muted-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          setValue('status', option.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })

                          if (
                            option.value !== 'vacation' &&
                            option.value !== 'unavailable'
                          ) {
                            setValue('unavailableStart', '', {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            setValue('unavailableEnd', '', {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        }}
                      >
                        <p className="font-medium text-foreground">{option.title}</p>
                        <p className="mt-1 leading-6">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {needsUnavailableWindow ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Inicio da indisponibilidade
                      </span>
                      <Input type="date" {...register('unavailableStart')} />
                      {errors.unavailableStart ? (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {errors.unavailableStart.message}
                        </p>
                      ) : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Fim da indisponibilidade
                      </span>
                      <Input type="date" {...register('unavailableEnd')} />
                      {errors.unavailableEnd ? (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {errors.unavailableEnd.message}
                        </p>
                      ) : null}
                    </label>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">Temas</span>
                    <span className="text-xs text-muted-foreground">
                      Somente temas ativos entram em novas designacoes
                    </span>
                  </div>

                  {hasInvalidSelectedThemes ? (
                    <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      <p className="font-medium">Temas fora da base ativa</p>
                      <p className="mt-2 leading-6">
                        Remova os temas inativos ou ausentes antes de salvar este orador.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {inactiveSelectedThemes.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            className="inline-flex items-center rounded-full border border-amber-300 bg-background px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-background dark:text-amber-100"
                            onClick={() => handleRemoveTheme(theme.id)}
                          >
                            Remover tema {theme.number} inativo
                          </button>
                        ))}
                        {missingSelectedThemeIds.map((themeId) => (
                          <button
                            key={themeId}
                            type="button"
                            className="inline-flex items-center rounded-full border border-amber-300 bg-background px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-background dark:text-amber-100"
                            onClick={() => handleRemoveTheme(themeId)}
                          >
                            Remover tema ausente
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeThemes.map((theme) => {
                      const isSelected = selectedThemeIds.includes(theme.id)

                      return (
                        <button
                          key={theme.id}
                          type="button"
                          className={`rounded-[20px] border px-4 py-4 text-left transition ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                              : 'border-border/80 bg-background hover:bg-accent'
                          }`}
                          onClick={() => handleToggleTheme(theme.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Tema {theme.number}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {theme.title}
                              </p>
                            </div>
                            <Badge variant={theme.isActive ? 'default' : 'outline'}>
                              {theme.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {errors.themeIds ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.themeIds.message}
                    </p>
                  ) : null}
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Observacoes</span>
                  <Textarea
                    placeholder="Anote detalhes operacionais relevantes sobre o orador."
                    {...register('notes')}
                  />
                  {errors.notes ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.notes.message}
                    </p>
                  ) : null}
                </label>
              </div>

              {!hasCongregationOptions || !hasThemeOptions ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {!hasCongregationOptions
                    ? selectedType === 'local'
                      ? 'Cadastre ao menos uma congregacao local ativa antes de salvar oradores locais.'
                      : 'Cadastre ao menos uma congregacao parceira ativa antes de salvar oradores visitantes.'
                    : 'Cadastre ao menos um tema ativo antes de salvar oradores.'}
                </div>
              ) : null}

              {hasInvalidSelectedThemes ? (
                <div className={getFeedbackContainerClassName('error')}>
                  O formulario ainda contem temas fora da base ativa. Remova esses vinculos antes de salvar.
                </div>
              ) : null}

              {feedback ? (
                <div className={getFeedbackContainerClassName(feedback.tone)}>
                  {feedback.message}
                </div>
              ) : null}

              {speakersQuery.isError ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {getErrorMessage(speakersQuery.error)}
                </div>
              ) : null}

              {congregationsQuery.isError ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {getErrorMessage(congregationsQuery.error)}
                </div>
              ) : null}

              {activeThemesQuery.isError ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {getErrorMessage(activeThemesQuery.error)}
                </div>
              ) : null}

              {themesManagementQuery.isError ? (
                <div className={getFeedbackContainerClassName('error')}>
                  {getErrorMessage(themesManagementQuery.error)}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  {editingSpeaker
                    ? `Ultima atualizacao em ${formatUpdatedAt(
                        editingSpeaker.updatedAt.toDate(),
                      )}.`
                    : 'Create, update e exclusao logica geram auditoria automatica.'}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || !isDirty}
                    onClick={() => reset(toSpeakerFormValues(editingSpeaker))}
                  >
                    Restaurar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !hasCongregationOptions ||
                      !hasThemeOptions ||
                      hasInvalidSelectedThemes
                    }
                  >
                    <Plus className="size-4" />
                    {editingSpeaker ? 'Salvar alteracoes' : 'Cadastrar orador'}
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
                <CardTitle className="text-2xl">Cadastro completo</CardTitle>
                <CardDescription>
                  Lista administrativa com filtros por tipo, congregacao e status,
                  sem leituras extras a cada busca local.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                <span>Resultados</span>
                <span className="font-medium text-foreground">
                  {filteredSpeakers.length}/{totalSpeakers}
                </span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_180px_210px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-11"
                  placeholder="Buscar por nome, e-mail, telefone..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <select
                className={selectClassName}
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as 'all' | SpeakerType)
                }
              >
                <option value="all">Todos os tipos</option>
                <option value="local">Locais</option>
                <option value="visitor">Visitantes</option>
              </select>
              <select
                className={selectClassName}
                value={congregationFilter}
                onChange={(event) => setCongregationFilter(event.target.value)}
              >
                <option value="all">Todas congregacoes</option>
                {(congregationsQuery.data ?? []).map((congregation) => (
                  <option key={congregation.id} value={congregation.id}>
                    {congregation.name}
                  </option>
                ))}
              </select>
              <select
                className={selectClassName}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | SpeakerStatus)
                }
              >
                {speakerFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {speakersQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-48 animate-pulse rounded-[22px] border border-border/70 bg-background"
                  />
                ))}
              </div>
            ) : null}

            {!speakersQuery.isLoading &&
            !speakersQuery.isError &&
            filteredSpeakers.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
                {totalSpeakers > 0
                  ? 'Nenhum orador corresponde aos filtros aplicados.'
                  : 'Nenhum orador cadastrado ainda na base do Firestore.'}
              </div>
            ) : null}

            {!speakersQuery.isLoading &&
            !speakersQuery.isError &&
            filteredSpeakers.length > 0 ? (
              <div className="space-y-3">
                {filteredSpeakers.map((speaker) => {
                  const congregationName =
                    congregationsQuery.data?.find(
                      (congregation) => congregation.id === speaker.congregationId,
                    )?.name ??
                    speaker.congregationName ??
                    'Congregacao nao encontrada'
                  const themeLabels = speaker.themeIds
                    .map((themeId) => {
                      const theme = themesById.get(themeId)

                      if (!theme) {
                        return 'Tema removido da base'
                      }

                      return theme.isActive
                        ? `Tema ${theme.number}`
                        : `Tema ${theme.number} (inativo)`
                    })
                    .filter((value): value is string => value !== null)
                  const unavailableStart = speaker.unavailableStart
                  const unavailableEnd = speaker.unavailableEnd
                  const hasUnavailableWindow =
                    unavailableStart && unavailableEnd

                  return (
                    <div
                      key={speaker.id}
                      className="rounded-[22px] border border-border/70 bg-background p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-3">
                            <AvatarBadge name={speaker.name} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-xl font-semibold text-foreground">
                                  {speaker.name}
                                </h3>
                                <Badge variant="outline">
                                  {speakerTypeLabels[speaker.type]}
                                </Badge>
                                <Badge className={getStatusBadgeClassName(speaker.status)}>
                                  {speakerStatusLabels[speaker.status]}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {congregationName}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="flex items-start gap-3 rounded-[18px] border border-border/70 bg-background px-4 py-4">
                              <Mail className="mt-0.5 size-4 text-primary" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  E-mail
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {speaker.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 rounded-[18px] border border-border/70 bg-background px-4 py-4">
                              <Phone className="mt-0.5 size-4 text-primary" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  Telefone
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {speaker.phone}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                            <div className="flex items-start gap-3">
                              <Mic2 className="mt-0.5 size-4 text-primary" />
                              <div>
                                <p className="text-foreground">Temas vinculados</p>
                                <p>
                                  {themeLabels.length > 0
                                    ? themeLabels.join(', ')
                                    : `${speaker.themeIds.length} tema(s) vinculado(s)`}
                                </p>
                              </div>
                            </div>

                            {hasUnavailableWindow ? (
                              <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                Periodo informado:{' '}
                                {formatDateRange(
                                  unavailableStart.toDate(),
                                  unavailableEnd.toDate(),
                                )}
                              </div>
                            ) : null}

                            <p className="leading-6">
                              {speaker.notes || 'Sem observacoes cadastradas.'}
                            </p>
                            <p className="text-xs">
                              Atualizado em {formatUpdatedAt(speaker.updatedAt.toDate())}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                          <Button
                            variant="outline"
                            onClick={() => handleStartEdit(speaker.id)}
                            disabled={isSubmitting}
                          >
                            <PencilLine className="size-4" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(speaker.id, speaker.name)}
                            disabled={isSubmitting || !speaker.isActive}
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
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
