import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type FeaturePageProps = {
  badge: string
  title: string
  description: string
  highlights: string[]
  aside: ReactNode
}

export function FeaturePage({
  badge,
  title,
  description,
  highlights,
  aside,
}: FeaturePageProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <Badge className="w-fit bg-primary/12 text-primary">{badge}</Badge>
          <CardTitle className="text-3xl md:text-4xl">{title}</CardTitle>
          <CardDescription className="max-w-2xl text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {highlights.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-border/70 bg-background/65 px-4 py-4 text-sm leading-6 text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/55">
        <CardHeader>
          <CardTitle>Preparado para a proxima fase</CardTitle>
          <CardDescription>
            Esta tela ja tem rota, identidade visual e estrutura para receber
            CRUD, filtros e hooks reais.
          </CardDescription>
        </CardHeader>
        <CardContent>{aside}</CardContent>
      </Card>
    </div>
  )
}
