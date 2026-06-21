import { CheckCircle2, X, XCircle } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  ToastContext,
  type ToastApi,
  type ToastInput,
  type ToastOptions,
  type ToastTone,
} from '@/components/ui/toast-context'
import { cn } from '@/lib/utils'

type ToastItem = ToastInput & {
  id: string
}

const toastDurationMs = 5200
const maxVisibleToasts = 4

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getToastClassName(tone: ToastTone) {
  return cn(
    'pointer-events-auto grid grid-cols-[auto_1fr_auto] gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur',
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-100'
      : 'border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-100',
  )
}

function getIconClassName(tone: ToastTone) {
  return tone === 'success'
    ? 'mt-0.5 size-5 text-emerald-600 dark:text-emerald-300'
    : 'mt-0.5 size-5 text-rose-600 dark:text-rose-300'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timerId = timersRef.current.get(id)

    if (timerId) {
      window.clearTimeout(timerId)
      timersRef.current.delete(id)
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    )
  }, [])

  const show = useCallback(
    (input: ToastInput) => {
      const id = createToastId()
      const toast: ToastItem = { ...input, id }

      setToasts((currentToasts) => {
        const nextToasts = [toast, ...currentToasts].slice(0, maxVisibleToasts)
        const visibleIds = new Set(nextToasts.map((item) => item.id))

        for (const item of currentToasts) {
          if (!visibleIds.has(item.id)) {
            const timerId = timersRef.current.get(item.id)

            if (timerId) {
              window.clearTimeout(timerId)
              timersRef.current.delete(item.id)
            }
          }
        }

        return nextToasts
      })

      const timerId = window.setTimeout(
        () => dismiss(id),
        input.durationMs ?? toastDurationMs,
      )
      timersRef.current.set(id, timerId)

      return id
    },
    [dismiss],
  )

  const success = useCallback(
    (message: string, options?: ToastOptions) =>
      show({ ...options, message, tone: 'success' }),
    [show],
  )

  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      show({ ...options, message, tone: 'error' }),
    [show],
  )

  const value = useMemo<ToastApi>(
    () => ({
      dismiss,
      error,
      show,
      success,
    }),
    [dismiss, error, show, success],
  )

  useEffect(() => {
    const timers = timersRef.current

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId))
      timers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-50 flex flex-col gap-3 sm:left-auto sm:right-4 sm:top-4 sm:w-[min(24rem,calc(100vw-2rem))]">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CheckCircle2 : XCircle

          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
              className={getToastClassName(toast.tone)}
            >
              <Icon className={getIconClassName(toast.tone)} />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">
                  {toast.title ?? (toast.tone === 'success' ? 'Tudo certo' : 'Algo deu errado')}
                </p>
                <p className="leading-5 opacity-90">{toast.message}</p>
              </div>
              <button
                type="button"
                aria-label="Fechar aviso"
                className="rounded-lg p-1 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:hover:bg-white/10"
                onClick={() => dismiss(toast.id)}
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
