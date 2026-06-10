import { useContext, useSyncExternalStore } from 'react'

import { Building2, CalendarClock, CalendarDays, Clock3 } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { PageHeaderContext } from '@/components/app/page-header-context'
import { getNavigationItem } from '@/config/navigation'
import { useAppSettingsQuery } from '@/hooks/use-app-settings'
import { useCongregationsQuery } from '@/hooks/use-congregations'
import { cn } from '@/lib/utils'

export function AppTopbar() {
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
    'inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:bg-card dark:text-muted-foreground'

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white px-3 py-2.5 shadow-sm dark:bg-card md:px-5">
      {isDashboard ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-base font-black text-slate-800 dark:text-foreground sm:text-lg">
                {currentItem.label}
              </h1>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {dashboardSummaryItems.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-4 py-2.5 shadow-sm dark:bg-card"
                  >
                    <Icon className="size-4 shrink-0 text-blue-600" />
                    <span className="text-[11px] font-black uppercase text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-sm font-black text-foreground">
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
                      <Icon className="size-3.5 shrink-0 text-blue-600" />
                      <span
                        className={cn(
                          'whitespace-nowrap',
                          item.emphasize && 'font-black text-slate-800 dark:text-foreground',
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
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 shadow-sm dark:bg-card"
                  >
                    <Icon className="size-3.5 shrink-0 text-blue-600" />
                    <span className="text-xs font-black text-foreground">
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-black text-slate-800 dark:text-foreground sm:text-lg">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-0.5 max-w-3xl text-xs font-medium leading-5 text-muted-foreground md:text-sm">
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
              <div className="flex w-max min-w-full items-center gap-2 lg:w-auto lg:min-w-0 lg:flex-wrap">
                {meta}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </header>
  )
}
