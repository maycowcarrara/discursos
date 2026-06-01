import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type SummaryStatProps = {
  label: string
  value: string
  detail?: string
  icon?: LucideIcon
  tone?: 'blue' | 'amber' | 'green' | 'slate'
  className?: string
}

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
} as const

export function SummaryStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
  className,
}: SummaryStatProps) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-border/70 bg-background px-4 py-4 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.18)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 break-words text-2xl leading-tight font-semibold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
        </div>
        {Icon ? (
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-xl',
              toneClasses[tone],
            )}
          >
            <Icon className="size-4" />
          </div>
        ) : null}
      </div>
      {detail ? (
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  )
}
