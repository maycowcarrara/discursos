import { CalendarDays, Mail, Mic2 } from 'lucide-react'
import { useMemo } from 'react'

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
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useRecentAssignmentsQuery } from '@/hooks/use-assignments'
import { useCalendarEventsQuery } from '@/hooks/use-calendar-events'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { useSpeakersQuery } from '@/hooks/use-speakers'
import { useThemesQuery } from '@/hooks/use-themes'
import {
  assignmentStatusLabels,
  calendarEventTypeLabels,
  formatCalendarDate,
  formatTimestampDate,
} from '@/utils/calendar-events'

const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

const currentYear = new Date().getFullYear()
const initialNow = Date.now()

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar a base de designacoes.'
}

function getStatusClassName(status: string) {
  if (status === 'confirmed') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (status === 'pending') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
  }

  return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
}

export function AssignmentsPage() {
  const appSettingsQuery = useAppSettingsQuery()
  const activeYear = appSettingsQuery.data?.defaultYear ?? currentYear

  const calendarEventsQuery = useCalendarEventsQuery(activeYear)
  const speakersQuery = useSpeakersQuery()
  const themesQuery = useThemesQuery()
  const congregationsQuery = useCongregationsQuery()
  const recentAssignmentsQuery = useRecentAssignmentsQuery(6)

  const publicTalkEvents = useMemo(
    () =>
      (calendarEventsQuery.data ?? []).filter(
        (event) => event.type === 'publicTalk' && !event.blocksAssignments,
      ),
    [calendarEventsQuery.data],
  )

  const nextPublicTalkEvent = useMemo(() => {
    return (
      publicTalkEvents.find((event) => event.date.toMillis() >= initialNow) ??
      publicTalkEvents[0]
    )
  }, [publicTalkEvents])

  const totalQueryErrors = [
    calendarEventsQuery.error,
    speakersQuery.error,
    themesQuery.error,
    congregationsQuery.error,
    recentAssignmentsQuery.error,
  ].filter(Boolean)

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">Base de designacoes</CardTitle>
              <CardDescription className="mt-2 text-base">
                A Fase 3 conectou `assignments` ao restante da base. O cadastro
                completo continua reservado para a Fase 8.
              </CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary">{activeYear}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Eventos de discurso</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {publicTalkEvents.length}
              </p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Oradores ativos</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {speakersQuery.data?.length ?? 0}
              </p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Temas ativos</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {themesQuery.data?.length ?? 0}
              </p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Historico recente</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {recentAssignmentsQuery.data?.length ?? 0}
              </p>
            </div>
          </div>

          {totalQueryErrors.length > 0 ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(totalQueryErrors[0])}
            </div>
          ) : null}

          <form className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="assignment-date" className="text-sm font-medium">
                Proximo evento de discurso
              </label>
              <Input
                id="assignment-date"
                value={
                  nextPublicTalkEvent
                    ? `${formatCalendarDate(nextPublicTalkEvent)} - ${nextPublicTalkEvent.title}`
                    : 'Nenhum evento de discurso encontrado'
                }
                readOnly
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="assignment-type" className="text-sm font-medium">
                Tipo de evento
              </label>
              <Input
                id="assignment-type"
                value={
                  nextPublicTalkEvent
                    ? calendarEventTypeLabels[nextPublicTalkEvent.type]
                    : 'Sem evento'
                }
                readOnly
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="assignment-congregation" className="text-sm font-medium">
                Congregacao
              </label>
              <select
                id="assignment-congregation"
                className={selectClassName}
                defaultValue=""
                disabled
              >
                <option value="">
                  {congregationsQuery.data && congregationsQuery.data.length > 0
                    ? 'Selecao sera ativada na Fase 8'
                    : 'Nenhuma congregacao ativa encontrada'}
                </option>
                {(congregationsQuery.data ?? []).map((congregation) => (
                  <option key={congregation.id} value={congregation.id}>
                    {congregation.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="assignment-speaker" className="text-sm font-medium">
                Orador
              </label>
              <select
                id="assignment-speaker"
                className={selectClassName}
                defaultValue=""
                disabled
              >
                <option value="">
                  {speakersQuery.data && speakersQuery.data.length > 0
                    ? 'Selecao sera ativada na Fase 8'
                    : 'Nenhum orador ativo encontrado'}
                </option>
                {(speakersQuery.data ?? []).map((speaker) => (
                  <option key={speaker.id} value={speaker.id}>
                    {speaker.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="assignment-theme" className="text-sm font-medium">
                Tema
              </label>
              <select
                id="assignment-theme"
                className={selectClassName}
                defaultValue=""
                disabled
              >
                <option value="">
                  {themesQuery.data && themesQuery.data.length > 0
                    ? 'Selecao sera ativada na Fase 8'
                    : 'Nenhum tema ativo encontrado'}
                </option>
                {(themesQuery.data ?? []).map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.number} - {theme.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <p className="font-medium">Base pronta para a Fase 8:</p>
              <p className="mt-2">
                `calendarEvents`, `congregations`, `speakers`, `themes` e
                `assignments` ja podem ser lidos no app.
              </p>
            </div>

            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-medium">Acoes ainda bloqueadas de proposito:</p>
              <p className="mt-2">
                criacao, edicao, confirmacao e cancelamento operacional ainda nao
                foram liberados fora da fase correta.
              </p>
            </div>

            <div className="flex flex-wrap gap-5 text-sm text-muted-foreground lg:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked readOnly />
                Base preparada para notificacoes futuras
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked readOnly />
                Base preparada para integracao futura com calendario
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
              <Button variant="outline" disabled>
                Cancelar
              </Button>
              <Button disabled>Salvar designacao na Fase 8</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Ultimas designacoes</CardTitle>
              <CardDescription className="mt-2">
                Leitura direta da colecao `assignments` para consultas rapidas.
              </CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary">Firestore</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAssignmentsQuery.isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-[22px] border border-border/70 bg-background"
                />
              ))
            ) : null}

            {!recentAssignmentsQuery.isLoading &&
            !recentAssignmentsQuery.isError &&
            recentAssignmentsQuery.data?.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
                Nenhuma designacao encontrada ainda no Firestore.
              </div>
            ) : null}

            {!recentAssignmentsQuery.isLoading &&
            !recentAssignmentsQuery.isError &&
            recentAssignmentsQuery.data &&
            recentAssignmentsQuery.data.length > 0
              ? recentAssignmentsQuery.data.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-[22px] border border-border/70 bg-background p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {formatTimestampDate(assignment.eventDate)}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {assignment.speakerName}
                        </p>
                      </div>
                      <Badge className={getStatusClassName(assignment.status)}>
                        {assignmentStatusLabels[assignment.status]}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-0.5 size-4 text-primary" />
                        <div>
                          <p className="text-foreground">
                            {calendarEventTypeLabels[assignment.eventType]}
                          </p>
                          <p>{assignment.localCongregationName}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mic2 className="mt-0.5 size-4 text-primary" />
                        <div>
                          <p className="text-foreground">{assignment.speakerName}</p>
                          <p>{assignment.originCongregationName}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 size-4 text-primary" />
                        <div>
                          <p className="text-foreground">
                            Tema {assignment.themeNumber}
                          </p>
                          <p>{assignment.themeTitle}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Regras oficiais lembradas aqui</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              RN001: nao permitir tema fora de `speakers.themeIds`.
            </div>
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              RN002 e RN003: bloquear congresso e assembleia a partir de
              `calendarEvents.blocksAssignments`.
            </div>
            <div className="rounded-[18px] border border-border/70 bg-background px-4 py-4">
              RN005: cancelamento muda status, nao apaga historico em `assignments`.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
