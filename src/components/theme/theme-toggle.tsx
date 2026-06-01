import type { ReactNode } from 'react'
import { MoonStar, SunMedium } from 'lucide-react'

import { useTheme } from '@/components/theme/use-theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  className?: string
  children?: ReactNode
  showActionLabel?: boolean
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ThemeToggle({
  className,
  children,
  showActionLabel = false,
  size,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const label =
    theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
  const actionLabel = theme === 'light' ? 'Modo escuro' : 'Modo claro'

  return (
    <Button
      type="button"
      variant="outline"
      size={size ?? (children || showActionLabel ? 'default' : 'icon')}
      className={cn(
        'border-border/70 bg-card/70 backdrop-blur dark:bg-card/80',
        className,
      )}
      onClick={toggleTheme}
      aria-label={label}
    >
      {theme === 'light' ? (
        <MoonStar className="size-4" />
      ) : (
        <SunMedium className="size-4" />
      )}
      {children ? <span>{children}</span> : null}
      {!children && showActionLabel ? <span>{actionLabel}</span> : null}
    </Button>
  )
}
