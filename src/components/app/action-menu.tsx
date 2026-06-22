import { MoreVertical, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type ActionMenuItem = {
  label: string
  onSelect: () => void
  icon?: LucideIcon
  disabled?: boolean
  tone?: 'default' | 'danger'
}

type ActionMenuProps = {
  label?: string
  items: ActionMenuItem[]
  align?: 'left' | 'right'
}

export function ActionMenu({
  label = 'Mais ações',
  items,
  align = 'right',
}: ActionMenuProps) {
  return (
    <details className="relative">
      <summary
        aria-label={label}
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden"
      >
        <MoreVertical className="size-4" />
      </summary>
      <div
        className={cn(
          'absolute z-20 mt-2 w-52 rounded-lg border border-border bg-popover p-1 shadow-lg',
          align === 'right' ? 'right-0' : 'left-0',
        )}
      >
        {items.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
                item.tone === 'danger' &&
                  'text-rose-700 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10',
              )}
              disabled={item.disabled}
              onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open')
                item.onSelect()
              }}
            >
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              {item.label}
            </button>
          )
        })}
      </div>
    </details>
  )
}
