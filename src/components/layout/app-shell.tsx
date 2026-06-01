import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { PageHeaderProvider } from '@/components/app/page-header-provider'
import { AppMobileNav } from '@/components/layout/app-mobile-nav'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { cn } from '@/lib/utils'

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-transparent lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen w-full grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-3 lg:p-3">
        <div className="hidden lg:block lg:h-full lg:min-h-0">
          <AppSidebar />
        </div>

        <PageHeaderProvider>
          <div className="app-surface relative min-w-0 overflow-hidden border border-border/75 shadow-[0_30px_70px_-42px_rgba(15,23,42,0.18)] lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:rounded-[30px]">
            <AppTopbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

            <main className="px-3 py-4 pb-28 md:px-5 md:py-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:py-5 lg:pb-6">
              <div
                key={`${location.pathname}${location.search}`}
                className="route-transition"
              >
                <Outlet />
              </div>
            </main>
          </div>
        </PageHeaderProvider>
      </div>

      <AppMobileNav onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/74 p-4 backdrop-blur-sm transition dark:bg-slate-950/80 lg:hidden',
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
