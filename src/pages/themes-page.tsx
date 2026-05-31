import { BookText, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useThemesQuery } from '@/hooks/use-themes'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel carregar os temas.'
}

export function ThemesPage() {
  const themesQuery = useThemesQuery()

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-3xl">Temas</CardTitle>
            <CardDescription className="mt-2 text-base">
              Catalogo real do Firestore, ordenado por numero e filtrado apenas
              para itens ativos.
            </CardDescription>
          </div>
          <Button disabled>
            <Plus className="size-4" />
            CRUD na Fase 5
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge className="bg-primary/10 text-primary">
              {themesQuery.data?.length ?? 0} temas ativos
            </Badge>
            <span>Consulta pronta para evoluir depois para busca rapida.</span>
          </div>

          {themesQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-40 animate-pulse rounded-[22px] border border-border/70 bg-background"
                />
              ))}
            </div>
          ) : null}

          {themesQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {getErrorMessage(themesQuery.error)}
            </div>
          ) : null}

          {!themesQuery.isLoading &&
          !themesQuery.isError &&
          themesQuery.data?.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/80 bg-background px-5 py-8 text-sm leading-6 text-muted-foreground">
              Nenhum tema ativo encontrado no Firestore. A tela ja esta pronta para
              receber o catalogo oficial da Fase 5.
            </div>
          ) : null}

          {!themesQuery.isLoading &&
          !themesQuery.isError &&
          themesQuery.data &&
          themesQuery.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {themesQuery.data.map((theme) => (
                <div
                  key={theme.id}
                  className="rounded-[22px] border border-border/70 bg-background p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BookText className="size-5" />
                    </div>
                    <Badge>Ativo</Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Tema {theme.number}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    {theme.title}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {theme.notes || 'Sem observacoes cadastradas.'}
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
