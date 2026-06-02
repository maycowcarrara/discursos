import { type AuthError } from 'firebase/auth'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { adminAccessRequiredErrorCode } from '@/services/auth/admin-access-service'
import { loginWithGoogle } from '@/services/auth/auth-service'

function getFirebaseErrorMessage(error: unknown) {
  const fallbackMessage = 'Não foi possível entrar agora. Tente novamente.'

  if (!error || typeof error !== 'object' || !('code' in error)) {
    return fallbackMessage
  }

  switch ((error as AuthError).code) {
    case adminAccessRequiredErrorCode:
      return 'Esta conta ainda não possui acesso administrativo ao painel.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde um pouco e tente novamente.'
    case 'auth/popup-closed-by-user':
      return 'A janela do Google foi fechada antes da conclusão do login.'
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela de login. Libere pop-ups e tente de novo.'
    case 'auth/operation-not-allowed':
      return 'O login com Google ainda não está habilitado neste ambiente.'
    default:
      return fallbackMessage
  }
}

function getRedirectPath(state: unknown) {
  if (
    typeof state === 'object' &&
    state &&
    'from' in state &&
    typeof state.from === 'object' &&
    state.from &&
    'pathname' in state.from &&
    typeof state.from.pathname === 'string'
  ) {
    return state.from.pathname
  }

  return '/'
}

function GoogleMark() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4.5 shrink-0"
      >
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.68-.06-1.33-.17-1.95H12v3.69h5.39a4.61 4.61 0 0 1-2 3.03v2.51h3.24c1.9-1.75 2.97-4.33 2.97-7.28Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.24-2.51c-.89.6-2.03.96-3.37.96-2.59 0-4.78-1.75-5.56-4.1H3.09v2.59A9.99 9.99 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.44 13.94A5.99 5.99 0 0 1 6.13 12c0-.67.11-1.32.31-1.94V7.47H3.09A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.09 4.53l3.35-2.59Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.96c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 2.96 14.7 2 12 2A9.99 9.99 0 0 0 3.09 7.47l3.35 2.59c.78-2.35 2.97-4.1 5.56-4.1Z"
        />
      </svg>
    </span>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const redirectPath = getRedirectPath(location.state)

  async function handleGoogleLogin() {
    setAuthError(null)
    setIsGoogleLoading(true)

    try {
      await loginWithGoogle()
      navigate(redirectPath, { replace: true })
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error))
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8 dark:bg-background">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-border dark:bg-card">
        <div className="border-b border-blue-500/30 bg-sidebar px-6 py-6 text-white">
          <Badge className="rounded-full border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white hover:bg-white/10">
            Painel administrativo
          </Badge>

          <div className="mt-4 space-y-2">
            <h1 className="text-3xl font-black text-white">
              Entrar
            </h1>
            <p className="text-sm font-medium leading-6 text-blue-100">
              Use a conta Google aprovada para acessar o sistema.
            </p>
          </div>
        </div>

        {authError ? (
          <div className="mx-5 mt-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {authError}
          </div>
        ) : null}

        <div className="space-y-4 px-5 pb-5 pt-5">
          <Button
            size="lg"
            className="h-14 w-full justify-center rounded-xl bg-blue-600 text-base font-black text-white shadow-sm hover:bg-blue-700"
            disabled={isGoogleLoading}
            onClick={handleGoogleLogin}
          >
            {isGoogleLoading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <GoogleMark />
                Entrar com Google
              </>
            )}
          </Button>

          <p className="pt-1 text-center text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
            O acesso é restrito aos administradores aprovados.
          </p>
        </div>
      </section>
    </div>
  )
}
