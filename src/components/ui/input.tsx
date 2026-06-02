import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Input({
  className,
  type = 'text',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-input bg-slate-50 px-4 py-2 text-sm font-medium text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-100 dark:bg-background dark:focus-visible:bg-card',
        className,
      )}
      {...props}
    />
  )
}
