import { useMemo, useState, type ReactNode } from 'react'

import {
  PageHeaderContext,
  type RegisteredPageHeader,
} from '@/components/app/page-header-context'

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<RegisteredPageHeader | null>(null)
  const value = useMemo(
    () => ({
      header,
      setHeader,
    }),
    [header],
  )

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  )
}
