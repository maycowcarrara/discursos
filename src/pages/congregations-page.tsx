import { MapPinned, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useCongregationsQuery } from '@/hooks/use-congregations'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar as congregacoes.'
}

export function CongregationsPage() {
  const congregationsQuery = useCongregationsQuery()

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-3xl">Congregacoes</CardTitle>
            <CardDescription className="mt-2 text-base">
              A Fase 3 ligou esta tela ao Firestore com leitura economica da
              colecao `congregations`.
            </CardDescription>
          </div>
          <Button disabled>
            <Plus className="size-4" />
            CRUD na Fase 4
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge className="bg-primary/10 text-primary">
              {congregationsQuery.data?.length ?? 0} ativas
            </Badge>
            <span>Ordenacao por nome com filtro de `isActive = true`.</span>
          </div>

          {congregationsQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-[22px] border border-border/70 bg-background"
                />
              ))}
            </div>
          ) : null}

          {congregationsQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(congregationsQuery.error)}
            </div>
          ) : null}

          {!congregationsQuery.isLoading &&
          !congregationsQuery.isError &&
          congregationsQuery.data?.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
              Nenhuma congregacao ativa encontrada no Firestore. Esta base ja esta
              pronta para receber os registros oficiais da Fase 4.
            </div>
          ) : null}

          {!congregationsQuery.isLoading &&
          !congregationsQuery.isError &&
          congregationsQuery.data &&
          congregationsQuery.data.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {congregationsQuery.data.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-border/70 bg-background p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MapPinned className="size-5" />
                    </div>
                    <Badge>{item.isLocal ? 'Local' : 'Parceira'}</Badge>
                  </div>

                  <h3 className="mt-4 text-xl font-semibold text-foreground">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.city}/{item.state}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.meetingDay} - {item.meetingTime}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {item.address}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
