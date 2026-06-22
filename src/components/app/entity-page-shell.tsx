import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type EntityPageShellProps = {
  children: ReactNode
  className?: string
}

export function EntityPageShell({ children, className }: EntityPageShellProps) {
  return (
    <div className={cn('space-y-4 sm:space-y-5', className)}>
      {children}
    </div>
  )
}
