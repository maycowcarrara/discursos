import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type CompactEntityCardProps = {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  badges?: ReactNode
  metadata?: ReactNode
  alert?: ReactNode
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  footer?: ReactNode
  className?: string
}

export function CompactEntityCard({
  title,
  subtitle,
  leading,
  badges,
  metadata,
  alert,
  primaryAction,
  secondaryActions,
  footer,
  className,
}: CompactEntityCardProps) {
  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 truncate text-base font-bold text-foreground">
                {title}
              </h3>
              {badges}
            </div>
            {subtitle ? (
              <div className="mt-1 text-sm leading-5 text-muted-foreground">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {(primaryAction || secondaryActions) ? (
          <div className="flex shrink-0 items-center gap-2">
            {primaryAction}
            {secondaryActions}
          </div>
        ) : null}
      </div>

      {metadata ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/70 pt-2.5">
          {metadata}
        </div>
      ) : null}

      {alert ? <div className="mt-2">{alert}</div> : null}
      {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
    </article>
  )
}
