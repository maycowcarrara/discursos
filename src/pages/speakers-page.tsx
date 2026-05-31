import { ChevronRight, Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { AvatarBadge } from '@/components/app/avatar-badge'
import { StatusPill } from '@/components/app/status-pill'
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
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { useSpeakersQuery } from '@/hooks/use-speakers'
import { useThemesQuery } from '@/hooks/use-themes'
import type { SpeakerStatus } from '@/types/firestore'

const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

const speakerStatusLabels: Record<SpeakerStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  transferred: 'Transferido',
  unavailable: 'Indisponivel',
  vacation: 'Ferias',
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar os oradores.'
}

export function SpeakersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'local' | 'visitor'>('all')
  const [congregationFilter, setCongregationFilter] = useState('all')

  const speakersQuery = useSpeakersQuery()
  const congregationsQuery = useCongregationsQuery()
  const themesQuery = useThemesQuery()

  const themesById = new Map(
    (themesQuery.data ?? []).map((theme) => [theme.id, theme.number]),
  )

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredSpeakers = (speakersQuery.data ?? []).filter((speaker) => {
    const matchesType = typeFilter === 'all' || speaker.type === typeFilter
    const matchesCongregation =
      congregationFilter === 'all' ||
      speaker.congregationId === congregationFilter
    const matchesSearch =
      normalizedSearch.length === 0 ||
      speaker.name.toLowerCase().includes(normalizedSearch) ||
      speaker.email.toLowerCase().includes(normalizedSearch)

    return matchesType && matchesCongregation && matchesSearch
  })

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-3xl">Oradores</CardTitle>
            <CardDescription className="mt-2 text-base">
              Leitura real do Firestore com filtros locais leves, sem pular o CRUD
              completo da Fase 6.
            </CardDescription>
          </div>
          <Button disabled>
            <Plus className="size-4" />
            CRUD na Fase 6
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge className="bg-primary/10 text-primary">
              {filteredSpeakers.length} de {speakersQuery.data?.length ?? 0} ativos
            </Badge>
            <span>Busca por nome/e-mail e filtros locais sem novas leituras.</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.3fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar orador..."
                className="pl-11"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <select
              className={selectClassName}
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as 'all' | 'local' | 'visitor')
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
          </div>

          {speakersQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-[22px] border border-border/70 bg-background"
                />
              ))}
            </div>
          ) : null}

          {speakersQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(speakersQuery.error)}
            </div>
          ) : null}

          {!speakersQuery.isLoading &&
          !speakersQuery.isError &&
          filteredSpeakers.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
              {speakersQuery.data && speakersQuery.data.length > 0
                ? 'Nenhum orador corresponde aos filtros aplicados.'
                : 'Nenhum orador ativo encontrado no Firestore ainda.'}
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

                const themeNumbers = speaker.themeIds
                  .map((themeId) => themesById.get(themeId))
                  .filter((value): value is number => typeof value === 'number')

                return (
                  <div
                    key={speaker.id}
                    className="flex flex-col gap-4 rounded-[22px] border border-border/70 bg-background px-4 py-4 lg:flex-row lg:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <AvatarBadge name={speaker.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {speaker.name}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {speaker.email}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {speaker.phone}
                        </p>
                      </div>
                    </div>

                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      <div>
                        <StatusPill
                          status={speaker.type === 'local' ? 'local' : 'visitor'}
                        />
                        <p className="mt-2 text-sm text-foreground">
                          {congregationName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Temas</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {themeNumbers.length > 0
                            ? themeNumbers.join(', ')
                            : `${speaker.themeIds.length} vinculado(s)`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Status</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {speakerStatusLabels[speaker.status]}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 self-start text-sm font-medium text-primary lg:self-center">
                      Base ativa
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
