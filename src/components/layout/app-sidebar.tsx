import { LogOut, MicVocal } from 'lucide-react'
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
}

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const { user } = useAuth()

  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden border-sidebar-border/80 bg-[linear-gradient(180deg,#0a1d43,#102754_42%,#0c1c3f)] p-3 text-white shadow-[0_28px_64px_-36px_rgba(8,18,43,0.92)]',
        mobile
          ? 'w-full rounded-[24px] border'
          : 'h-full min-h-0 rounded-[22px] border',
      )}
    >
      <div className="rounded-[16px] border border-white/10 bg-white/8 px-3 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-white/12 text-white">
            <MicVocal className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[1.05rem] font-semibold leading-5 text-white">
              Discursos Públicos
            </h1>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
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
                  'group rounded-[18px] px-3.5 py-2.5 transition-colors',
                  isActive
                    ? 'bg-[linear-gradient(135deg,#1f66e5,#1d4ed8)] text-sidebar-accent-foreground shadow-[0_16px_32px_-24px_rgba(37,99,235,0.95)]'
                    : 'text-white/92 hover:bg-white/10 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'rounded-xl border p-2',
                      isActive
                        ? 'border-white/10 bg-white/14 text-white'
                        : 'border-white/10 bg-white/8 text-white/92',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <p className="min-w-0 truncate font-medium">{item.label}</p>
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-3 rounded-[18px] border border-white/10 bg-white/8 p-2">
        <div className="rounded-[16px] border border-white/10 bg-white/7 px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            <AvatarBadge
              name={user?.displayName ?? 'Administrador'}
              photoUrl={user?.photoURL ?? null}
              size="sm"
              className="ring-2 ring-white/12"
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

        <div className="mt-1.5 flex items-center gap-1.5">
          <ThemeToggle
            size="icon"
            className="size-9 shrink-0 rounded-[14px] border-white/12 bg-white/8 text-white hover:bg-white/12 hover:text-white"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 min-w-0 flex-1 justify-start rounded-[14px] border-white/12 bg-white/8 px-3 text-white hover:bg-white/12 hover:text-white"
            onClick={() => void logout()}
            aria-label="Sair do sistema"
          >
            <LogOut className="size-4" />
            <span>Sair da conta</span>
          </Button>
        </div>
      </div>
    </aside>
  )
}
