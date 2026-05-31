import { BookText, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { themeCards } from '@/data/mock-operations'

export function ThemesPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-3xl">Temas</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Catalogo com leitura objetiva para evoluir depois para busca e
              ordenacao reais.
            </p>
          </div>
          <Button>
            <Plus className="size-4" />
            Novo tema
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {themeCards.map((theme) => (
            <div
              key={theme.number}
              className="rounded-[22px] border border-border/70 bg-background p-5"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookText className="size-5" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Tema {theme.number}</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">
                {theme.title}
              </h3>
              <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-300">
                {theme.status}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
