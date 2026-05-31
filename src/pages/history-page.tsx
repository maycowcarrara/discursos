import { ArrowLeft } from 'lucide-react'

import { AvatarBadge } from '@/components/app/avatar-badge'
import { StatusPill } from '@/components/app/status-pill'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { speakerHistory } from '@/data/mock-operations'

export function HistoryPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <CardTitle className="text-3xl">Historico do orador</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Estrutura inspirada no mockup para consultas antigas e futuras
                integracoes com `assignments` e `auditLogs`.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px]">
            <div className="flex items-center gap-4 rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <AvatarBadge name="Carlos Oliveira" size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-semibold text-foreground">
                    Carlos Oliveira
                  </p>
                  <StatusPill status="visitor">Visitante</StatusPill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Palmas Sul</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Total de discursos</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">27</p>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
              <p className="text-sm text-muted-foreground">Ultimo discurso</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                ha 34 dias
              </p>
              <p className="mt-2 text-sm text-muted-foreground">10/05/2026</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background">
            <div className="hidden grid-cols-[140px_1.2fr_1.6fr_120px_140px] gap-4 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground md:grid">
              <span>Data</span>
              <span>Congregacao</span>
              <span>Tema</span>
              <span>Tipo</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-border/70">
              {speakerHistory.map((entry) => (
                <div
                  key={`${entry.date}-${entry.theme}`}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[140px_1.2fr_1.6fr_120px_140px] md:items-center"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                      Data
                    </p>
                    <p className="text-sm text-foreground">{entry.date}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                      Congregacao
                    </p>
                    <p className="text-sm text-foreground">{entry.congregation}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                      Tema
                    </p>
                    <p className="text-sm text-foreground">{entry.theme}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                      Tipo
                    </p>
                    <p className="text-sm text-foreground">{entry.type}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                      Status
                    </p>
                    <StatusPill status="confirmed">{entry.status}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline">Ver historico completo</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
