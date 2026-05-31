import { BellRing, CalendarSync, SlidersHorizontal } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { settingsCards } from '@/data/mock-operations'

const icons = [SlidersHorizontal, BellRing, CalendarSync] as const

export function SettingsPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Configuracoes</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Paineis resumidos para separar comportamento global, notificacoes e
            calendario sem misturar com dados operacionais.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {settingsCards.map((item, index) => {
            const Icon = icons[index]

            return (
              <div
                key={item.title}
                className="rounded-[22px] border border-border/70 bg-background p-5"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
