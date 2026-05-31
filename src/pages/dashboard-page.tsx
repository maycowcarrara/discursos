import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPinned,
  Mic2,
  TriangleAlert,
  UsersRound,
} from 'lucide-react'

import { MetricCard } from '@/components/app/metric-card'
import { StatusPill } from '@/components/app/status-pill'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  annualPlanningMonths,
  congregationProfile,
  dashboardMetrics,
  nextSaturdayAssignment,
} from '@/data/mock-operations'

const overviewIcons = [TriangleAlert, CalendarDays, UsersRound] as const

const summaryCards = [
  { label: 'Oradores locais', value: '22', icon: UsersRound },
  { label: 'Oradores visitantes', value: '58', icon: Mic2 },
  { label: 'Temas cadastrados', value: '89', icon: Bell },
  { label: 'Congregacoes parceiras', value: '14', icon: MapPinned },
] as const

export function DashboardPage() {
  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-3xl">Dashboard</CardTitle>
                <CardDescription className="mt-1 text-base">
                  Panorama rapido da congregacao local e do proximo sabado.
                </CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary">Painel operacional</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[22px] border border-border/70 bg-background p-5">
              <p className="text-sm font-medium text-muted-foreground">
                Congregacao local
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {congregationProfile.name}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {congregationProfile.address}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-border/70 bg-card px-4 py-4">
                  <p className="text-sm text-muted-foreground">Reuniao publica</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <CalendarDays className="size-4 text-primary" />
                    {congregationProfile.meetingDay}
                  </p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <Clock3 className="size-4 text-primary" />
                    {congregationProfile.meetingTime}
                  </p>
                </div>
                <div className="rounded-[18px] border border-border/70 bg-card px-4 py-4">
                  <p className="text-sm text-muted-foreground">Ultima revisao</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    Junho 2026
                  </p>
                  <p className="mt-2 text-sm text-primary">
                    {congregationProfile.mapsLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background p-5">
              <p className="text-sm font-medium text-muted-foreground">
                Proximo sabado
              </p>
              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="w-full max-w-[128px] rounded-[22px] border border-primary/20 bg-primary/5 px-4 py-5 text-center">
                  <p className="text-4xl font-semibold tracking-tight text-primary">
                    {nextSaturdayAssignment.dateDay}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {nextSaturdayAssignment.dateLabel}
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {nextSaturdayAssignment.timeLabel}
                  </p>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-semibold text-foreground">
                      {nextSaturdayAssignment.speaker}
                    </p>
                    <StatusPill status="visitor">
                      {nextSaturdayAssignment.speakerType}
                    </StatusPill>
                  </div>
                  <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Congregacao:</span>{' '}
                      {nextSaturdayAssignment.congregation}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Tema:</span>{' '}
                      {nextSaturdayAssignment.theme}
                    </p>
                  </div>
                  <div className="pt-1">
                    <StatusPill status="confirmed">
                      {nextSaturdayAssignment.status}
                    </StatusPill>
                  </div>
                </div>

                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="size-7" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Planejamento anual</CardTitle>
            <CardDescription>
              Visao compacta dos proximos meses com foco nas pendencias.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {annualPlanningMonths.slice(0, 4).map((month) => (
              <div
                key={month.month}
                className="rounded-[20px] border border-border/70 bg-background p-4"
              >
                <p className="text-sm font-semibold text-foreground">{month.month}</p>
                <div className="mt-3 space-y-2">
                  {month.entries.slice(0, 4).map((entry) => (
                    <div
                      key={`${month.month}-${entry.day}-${entry.label}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <StatusPill status={entry.status} className="px-2 py-0.5">
                        {entry.day}
                      </StatusPill>
                      <span>{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardMetrics.map((metric, index) => {
          const Icon = overviewIcons[index]

          return (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              tone={metric.tone}
              icon={Icon}
            />
          )
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Acoes da semana</CardTitle>
            <CardDescription>
              Prioridades mais imediatas para manter a agenda sob controle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Definir orador para 20/06 e revisar tema correspondente.',
              'Confirmar retorno do visitante de Gurupi para 27/06.',
              'Fechar observacoes do evento especial de julho.',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[18px] border border-border/70 bg-background px-4 py-4 text-sm leading-6 text-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Resumo geral</CardTitle>
            <CardDescription>
              Indicadores basicos da base atual antes da Fase 3.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {summaryCards.map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  className="rounded-[20px] border border-border/70 bg-background px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
