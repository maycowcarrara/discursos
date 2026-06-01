import { useContext, useId, useLayoutEffect, type ReactNode } from 'react'

import {
  PageHeaderContext,
  type RegisteredPageHeader,
} from '@/components/app/page-header-context'

export type PageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
}: PageHeaderProps) {
  const context = useContext(PageHeaderContext)
  const id = useId()

  useLayoutEffect(() => {
    if (!context) {
      return undefined
    }

    const nextHeader: RegisteredPageHeader = {
      id,
      title,
      description,
      eyebrow,
      actions,
      meta,
    }

    context.setHeader(nextHeader)

    return () => {
      context.setHeader((currentHeader) =>
        currentHeader?.id === id ? null : currentHeader,
      )
    }
  }, [actions, context, description, eyebrow, id, meta, title])

  return null
}
