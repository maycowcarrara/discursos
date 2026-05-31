import { NavLink } from 'react-router-dom'

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
        'flex h-full flex-col rounded-[32px] border border-sidebar-border/80 bg-sidebar/95 p-4 text-sidebar-foreground shadow-[0_30px_80px_-60px_rgba(20,24,17,0.85)] backdrop-blur',
        mobile ? 'w-full' : 'min-h-[calc(100vh-2rem)]',
      )}
    >
      <div className="rounded-[24px] bg-sidebar-primary/95 px-5 py-5 text-sidebar-primary-foreground shadow-sm">
        <p className="text-xs uppercase tracking-[0.28em] text-sidebar-primary-foreground/70">
          Sistema
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold">
          Discursos Publicos
        </h1>
        <p className="mt-2 text-sm leading-6 text-sidebar-primary-foreground/80">
          Base administrativa para agenda anual, designacoes e historico.
        </p>
      </div>

      <nav className="mt-5 flex flex-1 flex-col gap-2">
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
                  'group rounded-[24px] px-4 py-3 transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                )
              }
            >
              {({ isActive }) => (
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 rounded-full border border-sidebar-border/80 p-2',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'bg-sidebar/70 text-sidebar-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-sm leading-5 text-sidebar-foreground/70">
                      {item.description}
                    </p>
                  </div>
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="rounded-[24px] border border-dashed border-sidebar-border/80 bg-sidebar-accent/40 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.22em] text-sidebar-foreground/65">
          Fase atual
        </p>
        <p className="mt-2 font-medium">Base tecnica em construcao</p>
        <p className="mt-1 text-sm leading-6 text-sidebar-foreground/70">
          Router, layout, tema e componentes base prontos para a Fase 2.
        </p>
      </div>

      <div className="mt-3 rounded-[24px] border border-sidebar-border/80 bg-sidebar/60 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.22em] text-sidebar-foreground/65">
          Sessao ativa
        </p>
        <p className="mt-2 truncate font-medium">
          {user?.displayName ?? 'Acesso autenticado'}
        </p>
        <p className="mt-1 truncate text-sm text-sidebar-foreground/70">
          {user?.email ?? 'Sem e-mail disponivel'}
        </p>
      </div>
    </aside>
  )
}
