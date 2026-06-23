import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { navigationItems, type NavigationItem } from '@/config/navigation'
import { cn } from '@/lib/utils'

type AppMobileNavProps = {
  onOpenMenu: () => void
}

function getMobileNavigationItem(href: string): NavigationItem {
  const item = navigationItems.find((navItem) => navItem.href === href)

  if (!item) {
    throw new Error(`Item de navegação mobile não encontrado: ${href}`)
  }

  return item
}

const leadingMobileItems = ['/temas', '/oradores'].map(getMobileNavigationItem)
const dashboardMobileItem = getMobileNavigationItem('/')
const trailingMobileItems = ['/designacoes'].map(getMobileNavigationItem)

export function AppMobileNav({ onOpenMenu }: AppMobileNavProps) {
  function renderMobileLink(item: NavigationItem) {
    const Icon = item.icon
    const isDashboard = item.href === '/'

    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href === '/'}
        className={({ isActive }) =>
          cn(
            'flex min-w-0 flex-col items-center justify-center gap-1 text-center font-bold leading-tight transition-colors',
            isDashboard
              ? '-mt-5 h-16 rounded-2xl bg-blue-600 px-2 text-[10px] text-white shadow-lg ring-4 ring-white hover:bg-blue-700 dark:ring-card'
              : 'h-14 rounded-lg px-1.5 py-2 text-[11px]',
            !isDashboard && (
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-muted-foreground dark:hover:bg-accent'
            ),
            isDashboard && isActive && 'bg-blue-700',
          )
        }
      >
        <Icon className={cn('shrink-0', isDashboard ? 'size-5' : 'size-4')} />
        <span className="w-full truncate">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_28px_rgba(15,23,42,0.12)] backdrop-blur dark:bg-card/95 lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-1.5">
        {leadingMobileItems.map(renderMobileLink)}
        {renderMobileLink(dashboardMobileItem)}
        {trailingMobileItems.map(renderMobileLink)}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-bold leading-tight text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-muted-foreground dark:hover:bg-accent"
          aria-label="Abrir menu completo"
        >
          <Menu className="size-4 shrink-0" />
          <span className="w-full truncate">Menu</span>
        </button>
      </div>
    </div>
  )
}
