import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type SummaryStatProps = {
  label: string
  value: string
  detail?: string
  icon?: LucideIcon
  tone?: 'blue' | 'amber' | 'green' | 'slate'
  size?: 'default' | 'compact'
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
  size = 'default',
  className,
}: SummaryStatProps) {
  const isCompact = size === 'compact'

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm',
        isCompact ? 'px-3.5 py-3 sm:px-4 sm:py-4' : 'px-4 py-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'font-black uppercase text-muted-foreground',
              isCompact ? 'text-[9px] sm:text-[10px]' : 'text-[10px]',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'break-words leading-tight font-black text-foreground',
              isCompact ? 'mt-1 text-xl sm:mt-1.5 sm:text-2xl' : 'mt-1.5 text-2xl',
            )}
          >
            {value}
          </p>
        </div>
        {Icon ? (
          <div
            className={cn(
              'flex items-center justify-center rounded-xl',
              isCompact ? 'size-8 sm:size-9' : 'size-9',
              toneClasses[tone],
            )}
          >
            <Icon className={cn(isCompact ? 'size-3.5 sm:size-4' : 'size-4')} />
          </div>
        ) : null}
      </div>
      {detail ? (
        <p
          className={cn(
            'text-muted-foreground',
            isCompact ? 'mt-1.5 text-xs leading-4 sm:mt-2 sm:text-sm sm:leading-5' : 'mt-2 text-sm leading-5',
          )}
        >
          {detail}
        </p>
      ) : null}
    </div>
  )
}
