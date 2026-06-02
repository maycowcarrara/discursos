import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { navigationItems } from '@/config/navigation'
import { cn } from '@/lib/utils'

type AppMobileNavProps = {
  onOpenMenu: () => void
}

const primaryMobileItems = navigationItems.filter((item) =>
  ['/', '/designacoes', '/oradores', '/temas'].includes(item.href),
)

export function AppMobileNav({ onOpenMenu }: AppMobileNavProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white px-2 py-2 shadow-sm dark:bg-card lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-1.5">
        {primaryMobileItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-bold leading-tight transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-muted-foreground dark:hover:bg-accent',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="w-full truncate">{item.label}</span>
            </NavLink>
          )
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-bold leading-tight text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-muted-foreground dark:hover:bg-accent"
          aria-label="Abrir menu completo"
        >
          <Menu className="size-4 shrink-0" />
          <span className="w-full truncate">Menu</span>
        </button>
      </div>
    </div>
  )
}
