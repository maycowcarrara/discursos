import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { AppMobileNav } from '@/components/layout/app-mobile-nav'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { cn } from '@/lib/utils'

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen w-full max-w-[1560px] gap-4 p-3 md:grid-cols-[272px_minmax(0,1fr)] md:gap-5 md:p-5">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-[30px] border border-border/80 bg-background/88 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.35)] backdrop-blur dark:bg-[linear-gradient(180deg,rgba(12,20,36,0.92),rgba(10,16,30,0.88))] dark:shadow-[0_32px_90px_-48px_rgba(2,8,23,0.95)]">
          <AppTopbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

          <main className="px-4 py-5 pb-28 md:px-6 md:py-6 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      <AppMobileNav onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/70 p-4 backdrop-blur-sm transition dark:bg-slate-950/72 md:hidden',
          isMobileMenuOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          className="absolute inset-0"
          aria-label="Fechar menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div className="relative mx-auto mt-6 max-w-sm">
          <AppSidebar mobile onNavigate={() => setIsMobileMenuOpen(false)} />
        </div>
      </div>
    </div>
  )
}
