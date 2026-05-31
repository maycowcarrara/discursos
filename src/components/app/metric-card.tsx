import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: string
  detail: string
  icon?: LucideIcon
  tone?: 'blue' | 'amber' | 'green'
  className?: string
}

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-200',
  amber:
    'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200',
  green:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200',
} as const

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-border/70 bg-card px-5 py-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] dark:shadow-[0_22px_56px_-34px_rgba(2,8,23,0.92)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        {Icon ? (
          <div
            className={cn(
              'flex size-11 items-center justify-center rounded-2xl',
              toneClasses[tone],
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}
