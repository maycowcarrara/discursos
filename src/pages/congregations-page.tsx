import { MapPinned, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { congregationCards } from '@/data/mock-operations'

export function CongregationsPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-3xl">Congregacoes</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Blocos preparados para o CRUD da Fase 4 com foco em leitura rapida.
            </p>
          </div>
          <Button>
            <Plus className="size-4" />
            Nova congregacao
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {congregationCards.map((item) => (
            <div
              key={item.name}
              className="rounded-[22px] border border-border/70 bg-background p-5"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPinned className="size-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">
                {item.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.location}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.schedule}</p>
              <p className="mt-4 text-sm font-medium text-primary">{item.role}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
