import { createContext, type Dispatch, type ReactNode, type SetStateAction } from 'react'

export type RegisteredPageHeader = {
  id: string
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  meta?: ReactNode
}

export type PageHeaderContextValue = {
  header: RegisteredPageHeader | null
  setHeader: Dispatch<SetStateAction<RegisteredPageHeader | null>>
}

export const PageHeaderContext = createContext<PageHeaderContextValue | null>(null)
