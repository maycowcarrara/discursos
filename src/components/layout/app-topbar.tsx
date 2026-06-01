import { BellDot, CalendarClock, LogOut, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { useAuth } from '@/components/auth/use-auth'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { AvatarBadge } from '@/components/app/avatar-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getNavigationItem } from '@/config/navigation'
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { logout } from '@/services/auth/auth-service'

type AppTopbarProps = {
  onOpenMobileMenu: () => void
}

export function AppTopbar({ onOpenMobileMenu }: AppTopbarProps) {
  const location = useLocation()
  const currentItem = getNavigationItem(location.pathname)
  const { user } = useAuth()
  const appSettingsQuery = useAppSettingsQuery()
  const baseYear = appSettingsQuery.data?.defaultYear ?? new Date().getFullYear()
  const todayLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/70 bg-background/92 px-4 py-4 backdrop-blur dark:bg-slate-950/38 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          className="md:hidden"
          variant="outline"
          size="icon"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu"
        >
          <Menu className="size-4" />
        </Button>

        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {currentItem.label}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground md:text-[2rem]">
            {currentItem.description}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden rounded-[18px] border border-border/70 bg-card px-3 py-2 text-right shadow-sm dark:bg-card/75 lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Hoje
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{todayLabel}</p>
        </div>
        <Badge className="hidden bg-primary/10 text-primary sm:inline-flex">
          <CalendarClock className="mr-2 size-3.5" />
          Ano base {baseYear}
        </Badge>
        <Badge className="hidden md:inline-flex">
          <BellDot className="mr-2 size-3.5" />
          Automacoes por worker
        </Badge>
        <div className="hidden items-center gap-2 rounded-[18px] border border-border/70 bg-card px-2 py-2 shadow-sm dark:bg-card/75 sm:flex">
          <AvatarBadge name={user?.displayName ?? 'Administrador'} size="sm" />
          <div className="hidden pr-1 text-left xl:block">
            <p className="text-sm font-medium text-foreground">
              {user?.displayName ?? 'Administrador'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.email ?? 'admin@congregacao.org'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => void logout()} aria-label="Sair">
          <LogOut className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
