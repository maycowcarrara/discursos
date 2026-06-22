import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type EntityToolbarProps = {
  searchValue: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  filters?: ReactNode
  summary?: ReactNode
  className?: string
}

export function EntityToolbar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  summary,
  className,
}: EntityToolbarProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        {filters ? (
          <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-[150px_190px_170px]">
            {filters}
          </div>
        ) : null}
        {summary ? <div className="lg:shrink-0">{summary}</div> : null}
      </div>
    </div>
  )
}
