import {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ThemeContext,
  type Theme,
  type ThemeContextValue,
} from '@/components/theme/theme-context'

type ThemeProviderProps = PropsWithChildren<{
  defaultTheme?: Theme
  storageKey?: string
}>

function getStoredTheme(storageKey: string, defaultTheme: Theme) {
  if (typeof window === 'undefined') {
    return defaultTheme
  }

  const storedTheme = window.localStorage.getItem(storageKey)

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return defaultTheme
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'discursos-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(storageKey, defaultTheme),
  )

  useEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(storageKey, theme)
  }, [storageKey, theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () =>
        setThemeState((currentTheme) =>
          currentTheme === 'light' ? 'dark' : 'light',
        ),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
