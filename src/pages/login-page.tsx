import { useState } from 'react'
import { type AuthError } from 'firebase/auth'
import {
  CalendarDays,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  currentDeliveredPhaseLabel,
  nextRequiredPhaseLabel,
} from '@/config/project-status'
import { annualPlanningMonths } from '@/data/mock-operations'
import { loginWithEmail, loginWithGoogle } from '@/services/auth/auth-service'

const loginSchema = z.object({
  email: z.email('Informe um e-mail valido'),
  password: z.string().min(6, 'Informe uma senha com pelo menos 6 caracteres'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function getFirebaseErrorMessage(error: unknown) {
  const fallbackMessage = 'Nao foi possivel entrar agora. Tente novamente.'

  if (!error || typeof error !== 'object' || !('code' in error)) {
    return fallbackMessage
  }

  switch ((error as AuthError).code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha invalidos.'
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

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function handleEmailLogin(values: LoginFormValues) {
    setAuthError(null)

    try {
      await loginWithEmail(values)
      navigate(redirectPath, { replace: true })
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error))
    }
  }

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
                  detail: `${nextRequiredPhaseLabel} com lembretes automaticos e confirmacao por e-mail.`,
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
                Use e-mail e senha ou Google para acessar o painel.
              </p>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(handleEmailLogin)}
              >
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@congregacao.org"
                      className="pl-11"
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Senha
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Sua senha"
                      className="pl-11"
                      {...form.register('password')}
                    />
                  </div>
                  {form.formState.errors.password ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                {authError ? (
                  <div className="rounded-[18px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {authError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full justify-center"
                  disabled={form.formState.isSubmitting || isGoogleLoading}
                >
                  {form.formState.isSubmitting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  Entrar com e-mail
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/80" />
                <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  ou
                </span>
                <div className="h-px flex-1 bg-border/80" />
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center"
                disabled={form.formState.isSubmitting || isGoogleLoading}
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
