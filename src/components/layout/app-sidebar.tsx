import { ChevronLeft, LogOut, MicVocal, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { AvatarBadge } from '@/components/app/avatar-badge'
import { useAuth } from '@/components/auth/use-auth'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { navigationItems } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth/auth-service'

type AppSidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
  onMobileClose?: () => void
  desktopExpanded?: boolean
  onDesktopExpandedChange?: (expanded: boolean) => void
}

export function AppSidebar({
  mobile = false,
  onNavigate,
  onMobileClose,
  desktopExpanded = true,
  onDesktopExpandedChange,
}: AppSidebarProps) {
  const { user } = useAuth()
  const expanded = mobile || desktopExpanded

  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-300 ease-in-out',
        mobile
          ? 'w-72 border-l border-blue-500/30'
          : 'h-full min-h-0 border-r border-blue-500/30',
      )}
    >
      <div
        className={cn(
          'relative flex h-16 shrink-0 items-center border-b border-blue-500/30 text-white',
          expanded ? 'justify-between px-4' : 'justify-center px-1',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center overflow-hidden',
            expanded ? 'gap-3' : 'justify-center',
          )}
        >
          <MicVocal
            className={cn('shrink-0 text-blue-200', expanded ? 'size-6' : 'size-7')}
            strokeWidth={2.5}
          />
          <div className={cn('min-w-0', !expanded && 'hidden')}>
            <h1 className="truncate text-lg font-black tracking-tight text-white">
              Discursos
            </h1>
            <p className="truncate text-[10px] font-bold uppercase text-blue-200">
              Gestão pública
            </p>
          </div>
        </div>

        {!mobile ? (
          <button
            type="button"
            className="hidden rounded p-1 text-blue-100 transition-colors hover:bg-blue-700 hover:text-white lg:block"
            onClick={() => onDesktopExpandedChange?.(!desktopExpanded)}
            aria-label={desktopExpanded ? 'Recolher menu' : 'Expandir menu'}
            title={desktopExpanded ? 'Recolher menu' : 'Expandir menu'}
          >
            <ChevronLeft
              className={cn('size-5 transition-transform', !desktopExpanded && 'rotate-180')}
            />
          </button>
        ) : (
          <button
            type="button"
            className="rounded p-1 text-blue-100 transition-colors hover:bg-blue-700 hover:text-white"
            onClick={onMobileClose}
            aria-label="Fechar menu"
            title="Fechar menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex w-full items-center justify-between border-l-4 px-4 py-3 transition-colors',
                  isActive
                    ? 'border-white bg-blue-800 text-white'
                    : 'border-transparent text-blue-100 hover:bg-blue-700 hover:text-white',
                  !expanded && 'justify-center px-0',
                )
              }
              title={expanded ? undefined : item.label}
              aria-label={item.label}
            >
              {() => (
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="size-[18px] shrink-0" />
                  {expanded ? (
                    <p className="min-w-0 truncate text-sm font-medium">{item.label}</p>
                  ) : null}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div
        className={cn(
          'shrink-0 border-t border-blue-500/30 bg-blue-900/40 p-4',
          !expanded && 'px-2',
        )}
      >
        {expanded ? (
          <div className="mb-2 rounded-lg border border-blue-700/50 bg-blue-800/50 p-2">
            <div className="flex items-center gap-2.5">
              <AvatarBadge
                name={user?.displayName ?? 'Administrador'}
                photoUrl={user?.photoURL ?? null}
                size="sm"
                className="ring-1 ring-blue-300"
              />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.displayName ?? 'Administrador'}
                </p>
                <p className="truncate text-[11px] text-white/72">
                  {user?.email ?? 'admin@congregacao.org'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className={cn('flex items-center gap-2', !expanded && 'flex-col')}>
          <ThemeToggle
            size="icon"
            className="size-9 shrink-0 rounded-lg border-blue-500/30 bg-blue-800/50 text-blue-100 hover:bg-blue-700 hover:text-white"
          />
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9 min-w-0 justify-start rounded-lg border-blue-500/30 bg-blue-800/50 px-3 text-blue-100 hover:bg-blue-700 hover:text-white',
              expanded ? 'flex-1' : 'size-9 px-0',
            )}
            onClick={() => void logout()}
            aria-label="Sair do sistema"
            title="Sair do sistema"
          >
            <LogOut className="size-4" />
            {expanded ? <span>Sair</span> : null}
          </Button>
        </div>
      </div>
    </aside>
  )
}
