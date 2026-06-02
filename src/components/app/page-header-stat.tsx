import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type PageHeaderStatProps = {
  label: string
  value: string
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

export function PageHeaderStat({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  className,
}: PageHeaderStatProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 shadow-sm dark:bg-card',
        className,
      )}
    >
      {Icon ? (
        <div
          className={cn(
            'flex size-7 items-center justify-center rounded-lg',
            toneClasses[tone],
          )}
        >
          <Icon className="size-3.5" />
        </div>
      ) : null}

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-xs font-black text-foreground">{value}</p>
      </div>
    </div>
  )
}
