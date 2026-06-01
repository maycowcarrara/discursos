import { useContext, useSyncExternalStore } from 'react'

import { Building2, CalendarClock, CalendarDays, Clock3, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { PageHeaderContext } from '@/components/app/page-header-context'
import { Button } from '@/components/ui/button'
import { getNavigationItem } from '@/config/navigation'
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { cn } from '@/lib/utils'

type AppTopbarProps = {
  onOpenMobileMenu: () => void
}

export function AppTopbar({ onOpenMobileMenu }: AppTopbarProps) {
  const location = useLocation()
  const currentItem = getNavigationItem(location.pathname)
  const pageHeaderStore = useContext(PageHeaderContext)
  const registeredHeader = useSyncExternalStore(
    pageHeaderStore?.subscribe ?? (() => () => undefined),
    pageHeaderStore?.getHeader ?? (() => null),
    () => null,
  )
  const appSettingsQuery = useAppSettingsQuery()
  const congregationsQuery = useCongregationsQuery()
  const baseYear = appSettingsQuery.data?.defaultYear ?? new Date().getFullYear()
  const localCongregation =
    congregationsQuery.data?.find((congregation) => congregation.isLocal) ?? null
  const isDashboard = currentItem.href === '/'
  const title = registeredHeader?.title ?? currentItem.label
  const description = registeredHeader?.description ?? currentItem.description
  const actions = registeredHeader?.actions ?? null
  const meta = registeredHeader?.meta ?? null
  const todayCompactLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
  const dashboardMetaItems = [
    {
      icon: Building2,
      label: localCongregation?.name ?? 'Congregação local',
      emphasize: true,
    },
    {
      icon: CalendarDays,
      label: localCongregation?.meetingDay ?? 'Dia a definir',
    },
    {
      icon: Clock3,
      label: localCongregation?.meetingTime ?? 'Horário a definir',
    },
  ]
  const dashboardSummaryItems = [
    {
      icon: CalendarClock,
      label: 'Ano base',
      value: String(baseYear),
    },
    {
      icon: CalendarDays,
      label: 'Hoje',
      value: todayCompactLabel,
    },
  ]

  const dashboardPillClass =
    'inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-muted-foreground'

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/94 px-3 py-3 backdrop-blur md:px-5">
      {isDashboard ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                className="rounded-[16px] border-border/70 bg-card shadow-sm lg:hidden"
                variant="outline"
                size="icon"
                onClick={onOpenMobileMenu}
                aria-label="Abrir menu"
              >
                <Menu className="size-4" />
              </Button>

              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-[1.9rem]">
                {currentItem.label}
              </h1>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {dashboardSummaryItems.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5"
                  >
                    <Icon className="size-3.5 shrink-0 text-primary" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
              <div className="flex min-w-max items-center gap-2">
                {dashboardMetaItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.label} className={dashboardPillClass}>
                      <Icon className="size-3.5 shrink-0 text-primary" />
                      <span
                        className={cn(
                          'whitespace-nowrap',
                          item.emphasize && 'font-medium text-foreground',
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              {dashboardSummaryItems.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1.5"
                  >
                    <Icon className="size-3.5 shrink-0 text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                className="mt-0.5 rounded-[16px] border-border/70 bg-card shadow-sm lg:hidden"
                variant="outline"
                size="icon"
                onClick={onOpenMobileMenu}
                aria-label="Abrir menu"
              >
                <Menu className="size-4" />
              </Button>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-[1.9rem]">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground md:text-[15px]">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {actions}
              </div>
            ) : null}
          </div>

          {meta ? (
            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
              <div className="flex min-w-max items-center gap-2">{meta}</div>
            </div>
          ) : null}
        </div>
      )}
    </header>
  )
}
