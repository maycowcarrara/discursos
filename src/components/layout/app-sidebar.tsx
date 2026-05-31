import { BookOpenText, ChevronDown, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { AvatarBadge } from '@/components/app/avatar-badge'
import { useAuth } from '@/components/auth/use-auth'
import { navigationItems } from '@/config/navigation'
import { cn } from '@/lib/utils'

type AppSidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
}

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const { user } = useAuth()

  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[28px] border border-sidebar-border/80 bg-[linear-gradient(180deg,rgba(11,26,60,0.98),rgba(8,21,49,0.99))] p-3 text-sidebar-foreground shadow-[0_30px_80px_-44px_rgba(8,18,43,0.95)] backdrop-blur',
        mobile ? 'w-full' : 'min-h-[calc(100vh-2rem)]',
      )}
    >
      <div className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-5 text-sidebar-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <BookOpenText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/88">Sistema de</p>
            <h1 className="mt-0.5 text-xl font-semibold leading-6 text-white">
              Discursos Publicos
            </h1>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex flex-1 flex-col gap-1.5">
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
                  'group rounded-[18px] px-3.5 py-3 transition-colors',
                  isActive
                    ? 'bg-[linear-gradient(135deg,#1f66e5,#1d4ed8)] text-sidebar-accent-foreground shadow-[0_16px_32px_-24px_rgba(37,99,235,0.95)]'
                    : 'text-sidebar-foreground/88 hover:bg-white/6 hover:text-sidebar-accent-foreground',
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
                        : 'border-white/8 bg-white/4 text-sidebar-foreground/88',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{item.label}</p>
                  </div>
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-4">
        <div className="flex items-center gap-2 text-white/82">
          <ShieldCheck className="size-4" />
          <p className="text-sm font-medium">Fase atual entregue</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-sidebar-foreground/72">
          Fase 2 concluida com autenticacao ativa. Proxima etapa obrigatoria:
          Firestore.
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/4 px-4 py-4">
        <AvatarBadge name={user?.displayName ?? 'Administrador'} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {user?.displayName ?? 'Administrador'}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {user?.email ?? 'admin@congregacao.org'}
          </p>
        </div>
        <ChevronDown className="size-4 text-sidebar-foreground/70" />
      </div>
    </aside>
  )
}
