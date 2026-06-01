import { createContext, type ReactNode, type SetStateAction } from 'react'

export type RegisteredPageHeader = {
  id: string
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  meta?: ReactNode
}

export type PageHeaderStore = {
  getHeader: () => RegisteredPageHeader | null
  setHeader: (next: SetStateAction<RegisteredPageHeader | null>) => void
  subscribe: (listener: () => void) => () => void
}

export const PageHeaderContext = createContext<PageHeaderStore | null>(null)
