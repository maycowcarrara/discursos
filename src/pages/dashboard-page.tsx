import { ArrowRight, CalendarDays, Clock3, Mic2, TriangleAlert } from 'lucide-react'

import { SectionCard } from '@/components/app/section-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const overviewCards = [
  {
    label: 'Proximos sabados',
    value: '08',
    detail: 'Janela prioritaria do planejamento operacional',
    icon: CalendarDays,
  },
  {
    label: 'Pendencias',
    value: '03',
    detail: 'Eventos sem confirmacao ou aguardando definicao',
    icon: TriangleAlert,
  },
  {
    label: 'Temas em rotacao',
    value: '24',
    detail: 'Base pronta para historico e alerta de repeticao',
    icon: Mic2,
  },
  {
    label: 'Lembretes',
    value: '00',
    detail: 'Automacoes entram na Fase 11 com Workers',
    icon: Clock3,
  },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(157,128,78,0.17),transparent_32%),linear-gradient(135deg,rgba(255,250,242,0.95),rgba(246,242,233,0.85))] p-6 shadow-sm md:p-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(201,162,91,0.16),transparent_30%),linear-gradient(135deg,rgba(21,24,20,0.95),rgba(17,19,18,0.88))]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="bg-primary/12 text-primary">Fase 1 entregue em camadas</Badge>
            <h3 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Uma base pensada para planejar o ano inteiro sem improvisar o sistema.
            </h3>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              A estrutura inicial agora ja nasce com rotas, layout administrativo,
              tema claro e escuro, React Query e uma base compativel com
              `shadcn/ui` para evoluir sem retrabalho.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button className="min-w-40 justify-between">
              Abrir agenda anual
              <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" className="min-w-40">
              Revisar schema do Firestore
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon

          return (
            <Card key={card.label} className="bg-card/88">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <CardTitle className="mt-3 text-4xl">{card.value}</CardTitle>
                </div>
                <div className="rounded-full bg-primary/12 p-3 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{card.detail}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Mapa da base"
          title="O projeto esta pronto para entrar em autenticacao e dados reais"
          description="A ideia aqui e tirar o projeto do template e colocar em uma espinha dorsal de produto."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {[
              'TypeScript estrito configurado com alias @/',
              'Tailwind v4 ativo com tokens e modo escuro',
              'Estrutura compativel com shadcn/ui e components.json',
              'React Router aplicado no shell administrativo',
              'React Query pronto para as proximas fases',
              'Sidebar, topbar e placeholders organizados por modulo',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-border/70 bg-background/70 px-4 py-4 text-sm leading-6 text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Proxima trilha"
          title="Sequencia recomendada"
          description="A fundacao da UI ja permite seguir sem retrabalho."
        >
          <div className="space-y-3">
            {[
              'Fase 2: Firebase Auth, persistencia de sessao e rotas protegidas',
              'Fase 3: servicos tipados, schema real e hooks de leitura',
              'Fase 4 em diante: CRUDs por modulo seguindo o schema oficial',
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-3 rounded-[22px] border border-border/70 bg-background/70 px-4 py-4"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-6 text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  )
}
