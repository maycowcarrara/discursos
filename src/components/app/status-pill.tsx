import { AlertTriangle, CalendarDays, Check, CircleSlash, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

type StatusPillProps = {
  status: 'confirmed' | 'pending' | 'event' | 'cancelled' | 'local' | 'visitor'
  children?: string
  className?: string
}

const config = {
  confirmed: {
    label: 'Confirmado',
    icon: Check,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/18 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  pending: {
    label: 'Pendente',
    icon: AlertTriangle,
    className:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/18 dark:bg-amber-500/10 dark:text-amber-200',
  },
  event: {
    label: 'Evento',
    icon: CalendarDays,
    className:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/18 dark:bg-violet-500/10 dark:text-violet-200',
  },
  cancelled: {
    label: 'Cancelado',
    icon: CircleSlash,
    className:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/18 dark:bg-rose-500/10 dark:text-rose-200',
  },
  local: {
    label: 'Local',
    icon: Users,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/18 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  visitor: {
    label: 'Visitante',
    icon: Users,
    className:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/18 dark:bg-blue-500/10 dark:text-blue-200',
  },
} as const

export function StatusPill({
  status,
  children,
  className,
}: StatusPillProps) {
  const current = config[status]
  const Icon = current.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        current.className,
        className,
      )}
    >
      <Icon className="size-3" />
      {children ?? current.label}
    </span>
  )
}
