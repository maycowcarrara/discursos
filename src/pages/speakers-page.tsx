import { ChevronRight, Plus, Search } from 'lucide-react'

import { AvatarBadge } from '@/components/app/avatar-badge'
import { StatusPill } from '@/components/app/status-pill'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { speakerSummaries } from '@/data/mock-operations'

const selectClassName =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

export function SpeakersPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-3xl">Oradores</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Lista operacional de locais e visitantes com foco em leitura rapida.
            </p>
          </div>
          <Button>
            <Plus className="size-4" />
            Novo orador
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[1.3fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar orador..." className="pl-11" />
            </div>
            <select className={selectClassName} defaultValue="all-types">
              <option value="all-types">Todos os tipos</option>
              <option value="local">Locais</option>
              <option value="visitor">Visitantes</option>
            </select>
            <select className={selectClassName} defaultValue="all-congregations">
              <option value="all-congregations">Todas congregacoes</option>
              <option value="palmas-centro">Palmas Centro</option>
              <option value="palmas-sul">Palmas Sul</option>
              <option value="gurupi-centro">Gurupi Centro</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {speakerSummaries.map((speaker) => (
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
                      {speaker.congregation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Temas</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {speaker.themes.join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Status</p>
                    <p className="mt-2 text-sm text-muted-foreground capitalize">
                      {speaker.status}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 self-start text-sm font-medium text-primary lg:self-center"
                >
                  Ver detalhes
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>1-10 de 90 oradores</p>
            <div className="flex items-center gap-2">
              {['1', '2', '3', '9'].map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`flex size-9 items-center justify-center rounded-xl border ${page === '1' ? 'border-primary/20 bg-primary/8 text-primary' : 'border-border bg-background text-foreground'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
