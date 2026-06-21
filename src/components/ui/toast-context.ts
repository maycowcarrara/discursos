import { createContext } from 'react'

export type ToastTone = 'success' | 'error'

export type ToastOptions = {
  title?: string
  durationMs?: number
}

export type ToastInput = ToastOptions & {
  tone: ToastTone
  message: string
}

export type ToastApi = {
  show: (input: ToastInput) => string
  success: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)
