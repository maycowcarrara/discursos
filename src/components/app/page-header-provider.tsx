import { useMemo, useRef, type ReactNode } from 'react'

import {
  PageHeaderContext,
  type PageHeaderStore,
  type RegisteredPageHeader,
} from '@/components/app/page-header-context'

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const headerRef = useRef<RegisteredPageHeader | null>(null)
  const listenersRef = useRef(new Set<() => void>())
  const store = useMemo<PageHeaderStore>(
    () => ({
      getHeader: () => headerRef.current,
      setHeader: (next) => {
        const nextHeader =
          typeof next === 'function'
            ? next(headerRef.current)
            : next

        headerRef.current = nextHeader
        listenersRef.current.forEach((listener) => {
          listener()
        })
      },
      subscribe: (listener) => {
        listenersRef.current.add(listener)

        return () => {
          listenersRef.current.delete(listener)
        }
      },
    }),
    [],
  )

  return (
    <PageHeaderContext.Provider value={store}>
      {children}
    </PageHeaderContext.Provider>
  )
}
