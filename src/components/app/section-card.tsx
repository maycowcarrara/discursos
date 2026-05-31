import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type SectionCardProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          {eyebrow}
        </p>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
