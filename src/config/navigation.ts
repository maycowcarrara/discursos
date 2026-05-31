import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  Church,
  History,
  LayoutDashboard,
  Mic2,
  Settings,
  Speech,
  UsersRound,
} from 'lucide-react'

export type NavigationItem = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    description: 'Visao geral do ano e das pendencias',
    icon: LayoutDashboard,
  },
  {
    href: '/congregacoes',
    label: 'Congregacoes',
    description: 'Cadastro e organizacao das congregacoes',
    icon: Church,
  },
  {
    href: '/oradores',
    label: 'Oradores',
    description: 'Cadastro de locais e visitantes',
    icon: UsersRound,
  },
  {
    href: '/temas',
    label: 'Temas',
    description: 'Controle oficial dos discursos',
    icon: Mic2,
  },
  {
    href: '/agenda',
    label: 'Agenda',
    description: 'Planejamento anual e eventos especiais',
    icon: CalendarDays,
  },
  {
    href: '/designacoes',
    label: 'Designacoes',
    description: 'Fluxo das confirmacoes e designacoes',
    icon: Speech,
  },
  {
    href: '/historico',
    label: 'Historico',
    description: 'Linha do tempo de discursos e auditoria',
    icon: History,
  },
  {
    href: '/configuracoes',
    label: 'Configuracoes',
    description: 'Preferencias do sistema e integracoes',
    icon: Settings,
  },
]

export function getNavigationItem(pathname: string) {
  return (
    navigationItems.find((item) =>
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? navigationItems[0]
  )
}
