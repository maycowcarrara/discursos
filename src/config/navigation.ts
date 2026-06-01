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
    description: 'Visao geral da operacao',
    icon: LayoutDashboard,
  },
  {
    href: '/agenda',
    label: 'Agenda',
    description: 'Calendario e datas especiais',
    icon: CalendarDays,
  },
  {
    href: '/designacoes',
    label: 'Designacoes',
    description: 'Entradas, saidas e confirmacoes',
    icon: Speech,
  },
  {
    href: '/oradores',
    label: 'Oradores',
    description: 'Locais, visitantes e temas',
    icon: UsersRound,
  },
  {
    href: '/temas',
    label: 'Temas',
    description: 'Catalogo oficial de discursos',
    icon: Mic2,
  },
  {
    href: '/congregacoes',
    label: 'Congregacoes',
    description: 'Base local e parceiras',
    icon: Church,
  },
  {
    href: '/historico',
    label: 'Historico',
    description: 'Linha do tempo e auditoria',
    icon: History,
  },
  {
    href: '/configuracoes',
    label: 'Configuracoes',
    description: 'Preferencias gerais do sistema',
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
