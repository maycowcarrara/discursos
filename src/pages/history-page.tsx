import { ArrowLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRecentAssignmentsQuery } from '@/hooks/use-assignments'
import {
  assignmentStatusLabels,
  formatTimestampDate,
} from '@/utils/calendar-events'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar o historico operacional.'
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

export function HistoryPage() {
  const recentAssignmentsQuery = useRecentAssignmentsQuery(12)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Voltar" disabled>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <CardTitle className="text-3xl">Historico operacional</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A Fase 3 ja consegue consultar `assignments`; filtros por orador,
                tema, congregacao e periodo ficam para a Fase 10.
              </p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary">Firestore</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {recentAssignmentsQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(recentAssignmentsQuery.error)}
            </div>
          ) : null}

          {recentAssignmentsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-[22px] border border-border/70 bg-background"
                />
              ))}
            </div>
          ) : null}

          {!recentAssignmentsQuery.isLoading &&
          !recentAssignmentsQuery.isError &&
          recentAssignmentsQuery.data?.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
              Nenhuma designacao encontrada para montar historico ainda.
            </div>
          ) : null}

          {!recentAssignmentsQuery.isLoading &&
          !recentAssignmentsQuery.isError &&
          recentAssignmentsQuery.data &&
          recentAssignmentsQuery.data.length > 0 ? (
            <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background">
              <div className="hidden grid-cols-[140px_1.1fr_1.5fr_1fr_140px] gap-4 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground md:grid">
                <span>Data</span>
                <span>Orador</span>
                <span>Tema</span>
                <span>Congregacao</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-border/70">
                {recentAssignmentsQuery.data.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="grid gap-3 px-4 py-4 md:grid-cols-[140px_1.1fr_1.5fr_1fr_140px] md:items-center"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                        Data
                      </p>
                      <p className="text-sm text-foreground">
                        {formatTimestampDate(assignment.eventDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                        Orador
                      </p>
                      <p className="text-sm text-foreground">{assignment.speakerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.originCongregationName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                        Tema
                      </p>
                      <p className="text-sm text-foreground">
                        {assignment.themeNumber} - {assignment.themeTitle}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                        Congregacao
                      </p>
                      <p className="text-sm text-foreground">
                        {assignment.localCongregationName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                        Status
                      </p>
                      <Badge className={getStatusClassName(assignment.status)}>
                        {assignmentStatusLabels[assignment.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="outline" disabled>
              Filtros completos na Fase 10
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
