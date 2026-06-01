import { useState } from 'react'
import { type AuthError } from 'firebase/auth'
import {
  CalendarDays,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  currentDeliveredPhaseLabel,
  nextRequiredStepLabel,
} from '@/config/project-status'
import { annualPlanningMonths } from '@/data/mock-operations'
import { adminAccessRequiredErrorCode } from '@/services/auth/admin-access-service'
import { loginWithGoogle } from '@/services/auth/auth-service'

function getFirebaseErrorMessage(error: unknown) {
  const fallbackMessage = 'Nao foi possivel entrar agora. Tente novamente.'

  if (!error || typeof error !== 'object' || !('code' in error)) {
    return fallbackMessage
  }

  switch ((error as AuthError).code) {
    case adminAccessRequiredErrorCode:
      return 'Esta conta nao possui acesso administrativo ao painel.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde um pouco e tente novamente.'
    case 'auth/popup-closed-by-user':
      return 'O login com Google foi fechado antes de concluir.'
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela de login. Libere popups e tente de novo.'
    case 'auth/operation-not-allowed':
      return 'Este metodo de login ainda nao esta habilitado no Firebase.'
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
    <div className="flex min-h-screen items-center justify-center px-4 py-8 md:px-8">
      <div className="grid w-full max-w-7xl gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="overflow-hidden rounded-[30px] border border-sidebar-border/80 bg-[linear-gradient(180deg,rgba(11,26,60,0.98),rgba(8,21,49,0.99))] p-6 text-white shadow-[0_30px_80px_-44px_rgba(8,18,43,0.95)] md:p-8">
          <Badge className="border-white/10 bg-white/10 text-white">
            {currentDeliveredPhaseLabel} concluida
          </Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            Acesso ao painel operacional de discursos com agenda real e leitura rapida.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/74">
            O login continua sustentando a sessao do app, enquanto a base ja
            entrega calendario, designacoes e dashboard operacional com foco em
            uso frequente no desktop e no mobile.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {[
                {
                  title: 'Sessao persistente',
                  detail: 'Firebase Auth restaura a sessao automaticamente.',
                  icon: ShieldCheck,
                },
                {
                  title: 'Dashboard operacional',
                  detail: 'Proximos 8 sabados, pendencias e eventos especiais em leitura real.',
                  icon: CalendarDays,
                },
                {
                  title: 'Proxima fase obrigatoria',
                  detail: `${nextRequiredStepLabel} com validacao operacional antes da abertura ao uso.`,
                  icon: Sparkles,
                },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-white/8 bg-white/6 px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-white/68">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/6 p-4">
              <p className="text-sm font-medium text-white/82">
                Amostra do planejamento anual
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {annualPlanningMonths.slice(0, 4).map((month) => (
                  <div
                    key={month.month}
                    className="rounded-[18px] border border-white/8 bg-white/6 px-3 py-3"
                  >
                    <p className="text-sm font-medium text-white">{month.month}</p>
                    <div className="mt-3 space-y-2 text-sm text-white/70">
                      {month.entries.slice(0, 2).map((entry) => (
                        <p key={`${month.month}-${entry.day}`}>{`${entry.day} - ${entry.label}`}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-border/80 bg-background/92 p-6 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.22)] md:p-8">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-3xl">Entrar</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Use sua conta Google aprovada para acessar o painel.
              </p>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {authError ? (
                <div className="mb-5 rounded-[18px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {authError}
                </div>
              ) : null}

              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center"
                disabled={isGoogleLoading}
                onClick={handleGoogleLogin}
              >
                {isGoogleLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Entrar com Google
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
