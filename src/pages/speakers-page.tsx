import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  LogIn,
  Mail,
  MapPin,
  Mic2,
  PencilLine,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { AvatarBadge } from '@/components/app/avatar-badge'
import { ActionMenu } from '@/components/app/action-menu'
import { CompactEntityCard } from '@/components/app/compact-entity-card'
import { EmptyState } from '@/components/app/empty-state'
import { EntityPageShell } from '@/components/app/entity-page-shell'
import { EntityToolbar } from '@/components/app/entity-toolbar'
import { MetadataChip } from '@/components/app/metadata-chip'
import { MetricStrip } from '@/components/app/metric-strip'
import { PageHeader } from '@/components/app/page-header'
import { ResponsiveFormPanel } from '@/components/app/responsive-form-panel'
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
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

const speakerTypeLabels: Record<SpeakerType, string> = {
  local: 'Local',
  visitor: 'Visitante',
}

const speakerStatusLabels: Record<SpeakerStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  unavailable: 'Indisponível',
}

const speakerTypeOptions: Array<{
  value: SpeakerType
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'local',
    title: 'Local',
    description: 'Da própria congregação.',
    icon: MapPin,
  },
  {
    value: 'visitor',
    title: 'Visitante',
    description: 'De congregação parceira.',
    icon: LogIn,
  },
]

const speakerStatusOptions: Array<{
  value: SpeakerStatus
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'active',
    title: 'Ativo',
    description: 'Disponível para designar.',
    icon: CheckCircle2,
  },
  {
    value: 'unavailable',
    title: 'Indisponível',
    description: 'Bloqueio temporário com período informado.',
    icon: Clock3,
  },
  {
    value: 'inactive',
    title: 'Inativo',
    description: 'Fora da operação atual.',
    icon: Ban,
  },
]

const speakerFilterOptions: Array<{
  value: 'all' | SpeakerStatus
  label: string
}> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'unavailable', label: 'Indisponíveis' },
  { value: 'inactive', label: 'Inativos' },
]

const emailValidationSchema = z.string().email()

function validateOptionalEmail(value: string) {
  return value.length === 0 || emailValidationSchema.safeParse(value).success
}

function validateOptionalPhone(value: string) {
  return value.length === 0 || value.replace(/\D/g, '').length >= 8
}

const speakerFormSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome do orador.'),
    email: z
      .string()
      .trim()
      .refine(validateOptionalEmail, 'Informe um e-mail válido.'),
    phone: z
      .string()
      .trim()
      .refine(validateOptionalPhone, 'Informe um WhatsApp válido.'),
    congregationId: z.string().trim().min(1, 'Selecione a congregação.'),
    type: z.enum(['local', 'visitor']),
    themeIds: z
      .array(z.string().trim().min(1))
      .min(1, 'Selecione pelo menos um tema.'),
    status: z.enum(['active', 'unavailable', 'inactive']),
    unavailableStart: z.string().trim(),
    unavailableEnd: z.string().trim(),
    notes: z.string().trim(),
  })
  .superRefine((values, context) => {
    const needsUnavailableWindow = values.status === 'unavailable'
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
        message: 'Datas de indisponibilidade só valem para status indisponível.',
        path: ['unavailableStart'],
      })
    }

    if (hasStart && hasEnd && values.unavailableStart > values.unavailableEnd) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A data final precisa ser igual ou posterior à data inicial.',
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

  return 'Não foi possível concluir a operação em oradores.'
}

function getFeedbackContainerClassName(tone: 'success' | 'error') {
  if (tone === 'success') {
    return 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
}

function getStatusBadgeClassName(status: SpeakerStatus) {
  if (status === 'active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (status === 'unavailable') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  }

  return 'border-border bg-muted text-muted-foreground'
}

function getStatusOptionClassName(status: SpeakerStatus, isSelected: boolean) {
  const baseClassName =
    'flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition sm:text-sm'

  if (status === 'active') {
    return `${baseClassName} ${
      isSelected
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-500/20 dark:border-emerald-400/70 dark:bg-emerald-500/15 dark:text-emerald-100'
        : 'border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15'
    }`
  }

  if (status === 'unavailable') {
    return `${baseClassName} ${
      isSelected
        ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-500/20 dark:border-amber-400/70 dark:bg-amber-500/15 dark:text-amber-100'
        : 'border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15'
    }`
  }

  return `${baseClassName} ${
    isSelected
      ? 'border-slate-500 bg-slate-100 text-slate-800 shadow-sm ring-1 ring-slate-500/20 dark:border-slate-400/70 dark:bg-slate-500/20 dark:text-slate-100'
      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:hover:bg-slate-500/15'
  }`
}

function getStatusOptionIconClassName(status: SpeakerStatus, isSelected: boolean) {
  if (status === 'active') {
    return isSelected ? 'text-emerald-600 dark:text-emerald-200' : 'text-emerald-600'
  }

  if (status === 'unavailable') {
    return isSelected ? 'text-amber-600 dark:text-amber-200' : 'text-amber-600'
  }

  return isSelected ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'
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

  return `${startLabel} até ${endLabel}`
}

function getMissingContactLabels(email: string, phone: string) {
  const missingLabels: string[] = []

  if (email.trim().length === 0) {
    missingLabels.push('e-mail')
  }

  if (phone.trim().length === 0) {
    missingLabels.push('WhatsApp')
  }

  return missingLabels
}

function formatMissingContactLabels(labels: string[]) {
  if (labels.length === 0) {
    return ''
  }

  if (labels.length === 1) {
    return labels[0]
  }

  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
}

function parseCommaSeparatedThemeNumbers(value: string) {
  if (!value.includes(',')) {
    return []
  }

  const numbers = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item))
    .map((item) => Number(item))

  return Array.from(new Set(numbers))
}

export function SpeakersPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | SpeakerType>('all')
  const [congregationFilter, setCongregationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | SpeakerStatus>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [formThemeSearch, setFormThemeSearch] = useState('')

  const speakersQuery = useSpeakersManagementQuery()
  const congregationsQuery = useCongregationsQuery()
  const activeThemesQuery = useThemesQuery()
  const themesManagementQuery = useThemesManagementQuery()
  const createSpeakerMutation = useCreateSpeakerMutation()
  const updateSpeakerMutation = useUpdateSpeakerMutation()
  const deleteSpeakerMutation = useDeleteSpeakerMutation()

  const editingSpeaker = speakersQuery.data?.find((item) => item.id === editingId) ?? null
  const {
    formState: { errors },
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
  const normalizedFormThemeSearch = formThemeSearch.trim().toLowerCase()
  const formThemeSearchNumbers = parseCommaSeparatedThemeNumbers(
    normalizedFormThemeSearch,
  )
  const filteredFormThemes = activeThemes.filter((theme) => {
    if (!normalizedFormThemeSearch) return true
    if (formThemeSearchNumbers.length > 0) {
      return formThemeSearchNumbers.includes(theme.number)
    }

    return (
      String(theme.number).includes(normalizedFormThemeSearch) ||
      theme.title.toLowerCase().includes(normalizedFormThemeSearch)
    )
  })
  const themesById = new Map(
    (themesManagementQuery.data ?? []).map((theme) => [theme.id, theme]),
  )
  const selectedFormThemes = selectedThemeIds
    .map((themeId) => themesById.get(themeId) ?? null)
    .filter((theme): theme is NonNullable<typeof theme> => theme !== null)
    .sort((firstTheme, secondTheme) => firstTheme.number - secondTheme.number)
  const isThemeNumberListSearch = formThemeSearchNumbers.length > 0
  const formThemeListSearchIds = isThemeNumberListSearch
    ? filteredFormThemes.map((theme) => theme.id)
    : []
  const hasUnselectedThemeListSearchResults = formThemeListSearchIds.some(
    (themeId) => !selectedThemeIds.includes(themeId),
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
    speakersQuery.data?.filter((item) => item.status === 'unavailable').length ?? 0
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
  const needsUnavailableWindow = selectedStatus === 'unavailable'
  const selectedTypeOption =
    speakerTypeOptions.find((option) => option.value === selectedType) ?? null
  const selectedStatusOption =
    speakerStatusOptions.find((option) => option.value === selectedStatus) ?? null
  const hasInvalidSelectedThemes =
    inactiveSelectedThemes.length > 0 || missingSelectedThemeIds.length > 0

  const submitHandler = handleSubmit(async (values) => {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
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

        const message = 'Orador atualizado com sucesso.'
        setFeedback({
          tone: 'success',
          message,
        })
        toast.success(message)
      } else {
        await createSpeakerMutation.mutateAsync({
          ...values,
          actorUid: user.uid,
          actorName,
        })

        const message = 'Orador criado com sucesso.'
        setFeedback({
          tone: 'success',
          message,
        })
        toast.success(message)
      }

      setEditingId(null)
      setIsFormPanelOpen(false)
      setFormThemeSearch('')
      reset(defaultSpeakerFormValues)
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
    }
  })

  useEffect(() => {
    const selectedCongregationStillAllowed = availableCongregationOptions.some(
      (congregation) => congregation.id === selectedCongregationId,
    )
    const defaultLocalCongregationId =
      selectedType === 'local' ? availableCongregationOptions[0]?.id ?? '' : ''

    if (
      selectedType === 'local' &&
      defaultLocalCongregationId &&
      selectedCongregationId !== defaultLocalCongregationId &&
      (selectedCongregationId.length === 0 || !selectedCongregationStillAllowed)
    ) {
      setValue('congregationId', defaultLocalCongregationId, {
        shouldDirty: true,
        shouldValidate: true,
      })
      return
    }

    if (selectedCongregationId.length > 0 && !selectedCongregationStillAllowed) {
      setValue('congregationId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [availableCongregationOptions, selectedCongregationId, selectedType, setValue])

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

  function handleSelectThemeListSearchResults() {
    const nextThemeIds = Array.from(
      new Set([...selectedThemeIds, ...formThemeListSearchIds]),
    )

    setValue('themeIds', nextThemeIds, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  async function handleDelete(id: string, name: string) {
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
      `Remover ${name} da base ativa? O cadastro permanece para histórico e futura reativação.`,
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
        setIsFormPanelOpen(false)
        setFormThemeSearch('')
        reset(defaultSpeakerFormValues)
      }

      const message = 'Orador removido da base ativa com sucesso.'
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

  function handleStartCreate() {
    setEditingId(null)
    setFeedback(null)
    setFormThemeSearch('')
    reset(defaultSpeakerFormValues)
    setIsFormPanelOpen(true)
  }

  function handleStartEdit(id: string) {
    const speaker = speakersQuery.data?.find((item) => item.id === id)

    setEditingId(id)
    setFeedback(null)
    setFormThemeSearch('')

    if (speaker) {
      reset(toSpeakerFormValues(speaker))
    }

    setIsFormPanelOpen(true)
  }

  function handleFormPanelOpenChange(open: boolean) {
    setIsFormPanelOpen(open)

    if (!open) {
      setEditingId(null)
      setFormThemeSearch('')
      reset(defaultSpeakerFormValues)
    }
  }

  async function handleReactivate(id: string, name: string) {
    if (!user) {
      const message = 'Sua sessão expirou. Entre novamente para continuar.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    const speaker = speakersQuery.data?.find((item) => item.id === id)

    if (!speaker) {
      const message = 'O orador selecionado não foi encontrado.'
      setFeedback({
        tone: 'error',
        message,
      })
      toast.error(message)
      return
    }

    const confirmed = window.confirm(
      `Reativar ${name} na base operacional de oradores?`,
    )

    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      await updateSpeakerMutation.mutateAsync({
        ...toSpeakerFormValues(speaker),
        status: 'active',
        unavailableStart: '',
        unavailableEnd: '',
        id,
        actorUid: user.uid,
        actorName,
      })

      const message = 'Orador reativado com sucesso.'
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

  return (
    <EntityPageShell>
      <PageHeader
        eyebrow="Cadastro"
        title="Oradores"
        description="Mantenha a base de oradores organizada, com filtros simples e destaque para o que mais importa no uso diário."
        actions={
          <Button onClick={handleStartCreate}>
            <Plus className="size-4" />
            Novo orador
          </Button>
        }
      />

      <MetricStrip
        items={[
          {
            label: 'Cadastrados',
            value: String(totalSpeakers),
            icon: Mic2,
            tone: 'blue',
          },
          {
            label: 'Operacionais',
            value: String(operationalSpeakersCount),
            icon: Plus,
            tone: 'green',
          },
          {
            label: 'Indisponíveis',
            value: String(temporarilyUnavailableCount),
            icon: Phone,
            tone: 'amber',
          },
          {
            label: 'Visitantes',
            value: String(visitorsCount),
            icon: Mail,
            tone: 'slate',
          },
        ]}
      />

      {feedback && !isFormPanelOpen ? (
        <div className={getFeedbackContainerClassName(feedback.tone)}>
          {feedback.message}
        </div>
      ) : null}

      <section className="space-y-4">
        <ResponsiveFormPanel
          open={isFormPanelOpen}
          onOpenChange={handleFormPanelOpenChange}
          title={formModeLabel}
          description={
            editingSpeaker
              ? 'Atualize dados, status e temas do orador selecionado.'
              : 'Cadastre um orador com congregação, temas e status bem definidos.'
          }
          footer={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                {editingSpeaker
                  ? `Última atualização em ${formatUpdatedAt(
                      editingSpeaker.updatedAt.toDate(),
                    )}.`
                  : 'O cadastro permanece no histórico mesmo quando sai da base ativa.'}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFormPanelOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="speaker-form"
                  disabled={
                    isSubmitting ||
                    !hasCongregationOptions ||
                    !hasThemeOptions ||
                    hasInvalidSelectedThemes
                  }
                >
                  <Plus className="size-4" />
                  {editingSpeaker ? 'Salvar alterações' : 'Salvar orador'}
                </Button>
              </div>
            </div>
          }
        >
          <form id="speaker-form" className="space-y-5" onSubmit={submitHandler}>
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
                    <span className="text-sm font-medium text-foreground">
                      E-mail
                      <span className="font-normal text-muted-foreground"> opcional</span>
                    </span>
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
                    <span className="text-sm font-medium text-foreground">
                      WhatsApp
                      <span className="font-normal text-muted-foreground"> opcional</span>
                    </span>
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

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Tipo de orador
                  </span>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
                    {speakerTypeOptions.map((option) => {
                      const OptionIcon = option.icon

                      return (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                          selectedType === option.value
                            ? 'bg-background text-primary shadow-sm ring-1 ring-primary/25'
                            : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                        }`}
                        onClick={() =>
                          setValue('type', option.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <OptionIcon className="size-4 shrink-0" />
                        <span className="min-w-0 truncate font-medium">{option.title}</span>
                      </button>
                      )
                    })}
                  </div>
                  {selectedTypeOption ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      {selectedTypeOption.description}
                    </p>
                  ) : null}
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Congregação
                  </span>
                  <select className={selectClassName} {...register('congregationId')}>
                    <option value="">Selecione a congregação</option>
                    {availableCongregationOptions.map((congregation) => (
                      <option key={congregation.id} value={congregation.id}>
                        {congregation.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {selectedType === 'local'
                      ? 'Oradores locais só podem ser vinculados a congregações locais.'
                      : 'Oradores visitantes só podem ser vinculados a congregações parceiras ou externas.'}
                  </p>
                  {errors.congregationId ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.congregationId.message}
                    </p>
                  ) : null}
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <div className="grid grid-cols-3 gap-2">
                    {speakerStatusOptions.map((option) => {
                      const OptionIcon = option.icon
                      const isSelected = selectedStatus === option.value

                      return (
                      <button
                        key={option.value}
                        type="button"
                        className={getStatusOptionClassName(option.value, isSelected)}
                        onClick={() => {
                          setValue('status', option.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })

                          if (option.value !== 'unavailable') {
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
                        <OptionIcon
                          className={`size-4 shrink-0 ${getStatusOptionIconClassName(
                            option.value,
                            isSelected,
                          )}`}
                        />
                        <span className="min-w-0 truncate font-medium">{option.title}</span>
                      </button>
                      )
                    })}
                  </div>
                  {selectedStatusOption ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      {selectedStatusOption.description}
                    </p>
                  ) : null}
                </div>

                {needsUnavailableWindow ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Início da indisponibilidade
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

                <div className="min-w-0 space-y-3 overflow-hidden">
                  <div className="flex flex-col gap-2 min-[440px]:flex-row min-[440px]:items-center min-[440px]:justify-between">
                    <span className="text-sm font-medium text-foreground">Temas vinculados ({selectedThemeIds.length} selecionados)</span>
                    <span className="text-xs text-muted-foreground">
                      Somente temas ativos entram em novas designações
                    </span>
                  </div>

                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative min-w-0">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        className="h-10 min-w-0 pl-9 text-sm"
                        placeholder="Buscar por número, título ou lista: 40,55,70"
                        value={formThemeSearch}
                        onChange={(e) => setFormThemeSearch(e.target.value)}
                      />
                    </div>
                    {isThemeNumberListSearch && filteredFormThemes.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full shrink-0 sm:w-auto"
                        disabled={!hasUnselectedThemeListSearchResults}
                        onClick={handleSelectThemeListSearchResults}
                      >
                        {hasUnselectedThemeListSearchResults
                          ? 'Selecionar todos'
                          : 'Todos selecionados'}
                      </Button>
                    ) : null}
                  </div>

                  {selectedFormThemes.length > 0 ? (
                    <div className="min-w-0 max-w-full overflow-hidden">
                      <div className="flex max-w-full gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
                        {selectedFormThemes.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 text-xs font-medium text-primary transition hover:bg-primary/15"
                            title={`Remover tema ${theme.number}: ${theme.title}`}
                            onClick={() => handleRemoveTheme(theme.id)}
                          >
                            Tema {theme.number}
                            <X className="size-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {hasInvalidSelectedThemes ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
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

                  <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border p-3 bg-muted/5">
                    {filteredFormThemes.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredFormThemes.map((theme) => {
                          const isSelected = selectedThemeIds.includes(theme.id)

                          return (
                            <button
                              key={theme.id}
                              type="button"
                              className={`rounded-xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                                  : 'border-border bg-background hover:bg-accent'
                              }`}
                              onClick={() => handleToggleTheme(theme.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">
                                    Tema {theme.number}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">
                                    {theme.title}
                                  </p>
                                </div>
                                <Badge variant={theme.isActive ? 'default' : 'outline'} className="shrink-0 text-[10px] px-1.5 py-0 h-4">
                                  {theme.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        Nenhum tema encontrado para "{formThemeSearch}".
                      </div>
                    )}
                  </div>

                  {errors.themeIds ? (
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                      {errors.themeIds.message}
                    </p>
                  ) : null}
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Observações</span>
                  <Textarea
                    placeholder="Anote detalhes importantes sobre este orador."
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
                      ? 'Cadastre ao menos uma congregação local ativa antes de salvar oradores locais.'
                      : 'Cadastre ao menos uma congregação parceira ativa antes de salvar oradores visitantes.'
                    : 'Cadastre ao menos um tema ativo antes de salvar oradores.'}
                </div>
              ) : null}

              {hasInvalidSelectedThemes ? (
                <div className={getFeedbackContainerClassName('error')}>
                  O formulário ainda contém temas fora da base ativa. Remova esses vínculos antes de salvar.
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

          </form>
        </ResponsiveFormPanel>

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-2xl">Base de oradores</CardTitle>
                <CardDescription>
                  Lista principal para localizar, revisar e atualizar cadastros.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <EntityToolbar
              searchValue={searchTerm}
              searchPlaceholder="Buscar por nome, e-mail, WhatsApp..."
              onSearchChange={setSearchTerm}
              summary={
                <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <span>Resultados</span>
                  <span className="font-medium text-foreground">
                    {filteredSpeakers.length}/{totalSpeakers}
                  </span>
                </div>
              }
              filters={
                <>
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
                    <option value="all">Todas as congregações</option>
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
                </>
              }
            />

            {speakersQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-lg border border-border bg-background"
                  />
                ))}
              </div>
            ) : null}

            {!speakersQuery.isLoading &&
            !speakersQuery.isError &&
            filteredSpeakers.length === 0 ? (
              <EmptyState
                title={
                  totalSpeakers > 0
                    ? 'Nenhum orador encontrado'
                    : 'Ainda não há oradores cadastrados'
                }
                description={
                  totalSpeakers > 0
                    ? 'Ajuste os filtros para localizar o cadastro desejado.'
                    : 'Cadastre o primeiro orador para começar a montar a base.'
                }
              />
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
                    'Congregação não encontrada'
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
                  const missingContactLabels = getMissingContactLabels(
                    speaker.email,
                    speaker.phone,
                  )

                  return (
                    <CompactEntityCard
                      key={speaker.id}
                      leading={<AvatarBadge name={speaker.name} size="sm" />}
                      title={speaker.name}
                      subtitle={congregationName}
                      badges={
                        <>
                          <Badge variant="outline">
                            {speakerTypeLabels[speaker.type]}
                          </Badge>
                          <Badge className={getStatusBadgeClassName(speaker.status)}>
                            {speakerStatusLabels[speaker.status]}
                          </Badge>
                        </>
                      }
                      primaryAction={
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => handleStartEdit(speaker.id)}
                          disabled={isSubmitting}
                        >
                          <PencilLine className="size-4" />
                          Editar
                        </Button>
                      }
                      secondaryActions={
                        <ActionMenu
                          items={[
                            {
                              label: 'Reativar',
                              icon: RotateCcw,
                              disabled: isSubmitting || speaker.isActive,
                              onSelect: () => handleReactivate(speaker.id, speaker.name),
                            },
                            {
                              label: 'Remover da base ativa',
                              icon: Trash2,
                              disabled: isSubmitting || !speaker.isActive,
                              tone: 'danger',
                              onSelect: () => handleDelete(speaker.id, speaker.name),
                            },
                          ]}
                        />
                      }
                      metadata={
                        <>
                          <MetadataChip
                            label="Temas"
                            value={`${speaker.themeIds.length} vinculado(s)`}
                          />
                          <MetadataChip
                            label="E-mail"
                            value={speaker.email.trim() || 'Sem e-mail'}
                            tone={speaker.email.trim() ? 'default' : 'warning'}
                          />
                          <MetadataChip
                            label="WhatsApp"
                            value={speaker.phone.trim() || 'Sem WhatsApp'}
                            tone={speaker.phone.trim() ? 'default' : 'warning'}
                          />
                        </>
                      }
                      alert={
                        <>
                          {missingContactLabels.length > 0 ? (
                            <div className="flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                              <p>
                                Cadastro sem{' '}
                                {formatMissingContactLabels(missingContactLabels)}.
                              </p>
                            </div>
                          ) : null}
                          {hasUnavailableWindow ? (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                              Indisponível:{' '}
                              {formatDateRange(
                                unavailableStart.toDate(),
                                unavailableEnd.toDate(),
                              )}
                            </div>
                          ) : null}
                        </>
                      }
                      footer={
                        <>
                          <p className="line-clamp-1">
                            Temas:{' '}
                            {themeLabels.length > 0
                              ? themeLabels.join(', ')
                              : `${speaker.themeIds.length} tema(s) vinculado(s)`}
                          </p>
                          {speaker.notes ? (
                            <p className="mt-1 line-clamp-1">Obs.: {speaker.notes}</p>
                          ) : null}
                          <p className="mt-1">
                            Atualizado em {formatUpdatedAt(speaker.updatedAt.toDate())}
                          </p>
                        </>
                      }
                    />
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

    </EntityPageShell>
  )
}
