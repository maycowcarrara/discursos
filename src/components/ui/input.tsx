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
        'flex h-11 w-full rounded-2xl border border-input bg-background/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  )
}
