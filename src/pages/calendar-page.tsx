import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

import { StatusPill } from '@/components/app/status-pill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { annualPlanningMonths } from '@/data/mock-operations'

export function CalendarPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-3xl">Planejamento anual</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Grade anual com status resumido por sabado, incluindo bloqueios por
              congresso e assembleia.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Ano anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="rounded-2xl border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground">
              2026
            </div>
            <Button variant="outline" size="icon" aria-label="Proximo ano">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline">Hoje</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <StatusPill status="confirmed">Confirmado</StatusPill>
            <StatusPill status="pending">Atencao necessaria</StatusPill>
            <StatusPill status="event">Evento especial</StatusPill>
            <StatusPill status="cancelled">Cancelado</StatusPill>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            {annualPlanningMonths.map((month) => (
              <div
                key={month.month}
                className="rounded-[22px] border border-border/70 bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground">
                    {month.month}
                  </h3>
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CalendarDays className="size-4" />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {month.entries.map((entry) => (
                    <div
                      key={`${month.month}-${entry.day}-${entry.label}`}
                      className="flex items-start gap-3 rounded-[18px] border border-border/60 bg-card px-3 py-3"
                    >
                      <div className="w-8 pt-0.5 text-sm font-semibold text-foreground">
                        {entry.day}
                      </div>
                      <div className="min-w-0">
                        <StatusPill status={entry.status} className="mb-2" />
                        <p className="text-sm leading-6 text-foreground">
                          {entry.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-[22px] border border-border/70 bg-background p-4">
              <p className="text-base font-semibold text-foreground">Legenda</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <StatusPill status="confirmed" />
                  <span className="text-muted-foreground">Designacao confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status="pending" />
                  <span className="text-muted-foreground">Sem tema ou sem orador</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status="event" />
                  <span className="text-muted-foreground">
                    Congresso, assembleia ou evento especial
                  </span>
                </div>
                <div className="mt-5 rounded-[18px] border border-primary/15 bg-primary/6 px-4 py-4">
                  <Badge className="bg-primary/10 text-primary">
                    Proxima fase
                  </Badge>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Na Fase 7 esta grade deve nascer de `calendarEvents`, com
                    geracao anual e bloqueio real de designacoes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
