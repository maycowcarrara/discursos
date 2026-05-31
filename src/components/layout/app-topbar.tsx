import { BellDot, CalendarClock, LogOut, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { useAuth } from '@/components/auth/use-auth'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getNavigationItem } from '@/config/navigation'
import { logout } from '@/services/auth/auth-service'

type AppTopbarProps = {
  onOpenMobileMenu: () => void
}

export function AppTopbar({ onOpenMobileMenu }: AppTopbarProps) {
  const location = useLocation()
  const currentItem = getNavigationItem(location.pathname)
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-4 py-4 backdrop-blur md:px-8">
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
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {currentItem.label}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-foreground md:text-3xl">
            {currentItem.description}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden text-right lg:block">
          <p className="text-sm font-medium text-foreground">
            {user?.displayName ?? 'Usuario autenticado'}
          </p>
          <p className="text-xs text-muted-foreground">
            {user?.email ?? 'Sessao ativa no Firebase'}
          </p>
        </div>
        <Badge className="hidden bg-primary/10 text-primary sm:inline-flex">
          <CalendarClock className="mr-2 size-3.5" />
          Ano base 2026
        </Badge>
        <Badge className="hidden md:inline-flex">
          <BellDot className="mr-2 size-3.5" />
          Sem automacoes ativas
        </Badge>
        <Button variant="outline" size="icon" onClick={() => void logout()} aria-label="Sair">
          <LogOut className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
