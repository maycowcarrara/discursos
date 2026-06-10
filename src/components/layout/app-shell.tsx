import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { PageHeaderProvider } from '@/components/app/page-header-provider'
import { AppMobileNav } from '@/components/layout/app-mobile-nav'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { cn } from '@/lib/utils'

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <div
        className={cn(
          'grid min-h-screen w-full grid-cols-1 lg:h-full lg:min-h-0',
          isDesktopSidebarOpen
            ? 'lg:grid-cols-[256px_minmax(0,1fr)]'
            : 'lg:grid-cols-[64px_minmax(0,1fr)]',
        )}
      >
        <div className="hidden lg:block lg:h-full lg:min-h-0">
          <AppSidebar
            desktopExpanded={isDesktopSidebarOpen}
            onDesktopExpandedChange={setIsDesktopSidebarOpen}
          />
        </div>

        <PageHeaderProvider>
          <div className="app-surface relative min-w-0 overflow-hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <AppTopbar />

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
          'fixed inset-0 z-40 bg-background p-4 transition dark:bg-slate-950/80 lg:hidden',
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
        <div className="relative ml-auto h-full max-w-72">
          <AppSidebar
            mobile
            onNavigate={() => setIsMobileMenuOpen(false)}
            onMobileClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}
