import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { navigationItems } from '@/config/navigation'
import { cn } from '@/lib/utils'

type AppMobileNavProps = {
  onOpenMenu: () => void
}

const primaryMobileItems = navigationItems.filter((item) =>
  ['/', '/agenda', '/designacoes', '/oradores'].includes(item.href),
)

export function AppMobileNav({ onOpenMenu }: AppMobileNavProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/96 px-3 py-3 backdrop-blur dark:bg-slate-950/64 lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-2 rounded-[22px] border border-border/80 bg-card px-2 py-2 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] dark:bg-card/88 dark:shadow-[0_22px_56px_-34px_rgba(2,8,23,0.95)]">
        {primaryMobileItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-center text-[11px] font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_16px_28px_-20px_rgba(59,130,246,0.8)]'
                    : 'text-muted-foreground hover:bg-accent/70',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent/70"
          aria-label="Abrir menu completo"
        >
          <Menu className="size-4 shrink-0" />
          <span className="truncate">Menu</span>
        </button>
      </div>
    </div>
  )
}
