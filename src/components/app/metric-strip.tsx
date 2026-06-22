import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type MetricStripItem = {
  label: string
  value: string
  detail?: string
  icon?: LucideIcon
  tone?: 'blue' | 'amber' | 'green' | 'slate'
}

type MetricStripProps = {
  items: MetricStripItem[]
  className?: string
}

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
} as const

export function MetricStrip({ items, className }: MetricStripProps) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon

        return (
          <div
            key={item.label}
            className="min-w-[160px] rounded-lg border border-border bg-card px-3 py-2.5 sm:min-w-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-black leading-none text-foreground">
                  {item.value}
                </p>
              </div>
              {Icon ? (
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    toneClasses[item.tone ?? 'blue'],
                  )}
                >
                  <Icon className="size-4" />
                </div>
              ) : null}
            </div>
            {item.detail ? (
              <p className="mt-1.5 truncate text-xs text-muted-foreground">
                {item.detail}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
