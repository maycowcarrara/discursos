import { MoonStar, SunMedium } from 'lucide-react'

import { useTheme } from '@/components/theme/use-theme'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="border-border/70 bg-card/70 backdrop-blur dark:bg-card/80"
      onClick={toggleTheme}
      aria-label={
        theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
      }
    >
      {theme === 'light' ? (
        <MoonStar className="size-4" />
      ) : (
        <SunMedium className="size-4" />
      )}
    </Button>
  )
}
