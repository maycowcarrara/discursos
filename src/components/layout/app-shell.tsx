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
          'app-shell-grid grid min-h-screen w-full grid-cols-1 lg:h-full lg:min-h-0',
          isDesktopSidebarOpen
            ? 'lg:grid-cols-[256px_minmax(0,1fr)]'
            : 'lg:grid-cols-[64px_minmax(0,1fr)]',
        )}
      >
        <div className="app-shell-sidebar hidden lg:block lg:h-full lg:min-h-0">
          <AppSidebar
            desktopExpanded={isDesktopSidebarOpen}
            onDesktopExpandedChange={setIsDesktopSidebarOpen}
          />
        </div>

        <PageHeaderProvider>
          <div className="app-shell-surface app-surface relative min-w-0 overflow-hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <div className="app-shell-topbar">
              <AppTopbar />
            </div>

            <main className="app-shell-main px-3 py-4 pb-28 md:px-5 md:py-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:py-5 lg:pb-6">
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

      <div className="app-shell-mobile-nav">
        <AppMobileNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
      </div>

      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          isMobileMenuOpen
            ? 'pointer-events-auto'
            : 'pointer-events-none',
        )}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none dark:bg-slate-950/65',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Fechar menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 right-0 h-full w-[min(20rem,calc(100vw-2rem))] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none',
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
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
