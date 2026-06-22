import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useRouteError } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { refreshApp } from '@/services/app/app-version-service'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return ''
}

function isDynamicImportError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()

  return (
    message.includes('dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('module script failed')
  )
}

export function AppRouteErrorBoundary() {
  const error = useRouteError()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const chunkLoadFailed = isDynamicImportError(error)
  const title = chunkLoadFailed
    ? 'O app precisa ser atualizado'
    : 'Não foi possível carregar esta tela'
  const description = chunkLoadFailed
    ? 'Uma nova versão pode ter sido publicada enquanto você usava o sistema. Atualize para carregar os arquivos mais recentes.'
    : 'Atualize a página e tente novamente. Se o erro continuar, volte ao painel inicial.'

  async function handleRefresh() {
    setIsRefreshing(true)
    await refreshApp()
  }

  function handleGoHome() {
    window.location.assign('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-accent dark:text-accent-foreground">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>

        <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Erro de carregamento
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw
              className={isRefreshing ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            {isRefreshing ? 'Atualizando' : 'Atualizar app'}
          </Button>
          <Button variant="outline" onClick={handleGoHome}>
            <Home className="size-4" aria-hidden="true" />
            Ir para o painel
          </Button>
        </div>
      </section>
    </main>
  )
}
