import type { LucideIcon } from 'lucide-react'
import {
  Building2,
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

const dashboardNavigationItem: NavigationItem = {
  href: '/',
  label: 'Dashboard',
  description: 'Visão geral da operação',
  icon: LayoutDashboard,
}

export const navigationItems: NavigationItem[] = [
  dashboardNavigationItem,
  {
    href: '/designacoes',
    label: 'Designações',
    description: 'Sábados, oradores e temas',
    icon: Speech,
  },
  {
    href: '/oradores',
    label: 'Oradores',
    description: 'Locais, visitantes e repertório',
    icon: UsersRound,
  },
  {
    href: '/temas',
    label: 'Temas',
    description: 'Catálogo oficial de discursos',
    icon: Mic2,
  },
  {
    href: '/congregacoes',
    label: 'Congregações',
    description: 'Base local e parceiras',
    icon: Building2,
  },
  {
    href: '/historico',
    label: 'Histórico',
    description: 'Linha do tempo e consultas do ano',
    icon: History,
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    description: 'Ajustes gerais e integrações',
    icon: Settings,
  },
]

export function getNavigationItem(pathname: string) {
  return (
    navigationItems.find((item) =>
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? dashboardNavigationItem
  )
}
