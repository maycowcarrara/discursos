import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { cn } from '@/lib/utils'

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-4 p-4 md:grid-cols-[320px_minmax(0,1fr)] md:gap-6 md:p-6">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-[36px] border border-border/70 bg-background/80 shadow-[0_40px_120px_-70px_rgba(33,37,28,0.7)] backdrop-blur">
          <AppTopbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

          <main className="px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-30 bg-background/70 p-4 backdrop-blur-sm transition md:hidden',
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
