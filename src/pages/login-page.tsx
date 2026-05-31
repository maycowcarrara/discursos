import { useState } from 'react'
import { type AuthError } from 'firebase/auth'
import { LoaderCircle, LockKeyhole, LogIn, Mail, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-border/70 bg-background/86 shadow-[0_40px_120px_-80px_rgba(33,37,28,0.8)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(153,126,82,0.18),transparent_30%),linear-gradient(160deg,rgba(255,250,241,0.98),rgba(243,238,226,0.94))] p-6 md:p-10 xl:border-b-0 xl:border-r dark:bg-[radial-gradient(circle_at_top_left,rgba(196,159,93,0.18),transparent_28%),linear-gradient(160deg,rgba(19,21,18,0.98),rgba(15,17,15,0.96))]">
          <Badge className="bg-primary/12 text-primary">
            Fase 2 em andamento
          </Badge>
          <h1 className="mt-5 max-w-xl font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Acesso protegido para a agenda anual de discursos.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            A sessao agora e restaurada automaticamente pelo Firebase Auth, com
            rotas protegidas e uma base pronta para as permissoes das proximas
            fases.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              'Persistencia local de sessao no navegador',
              'Redirecionamento automatico para a rota solicitada',
              'Base pronta para regras de acesso por perfil',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-border/70 bg-background/72 px-4 py-4 text-sm leading-6 text-foreground"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-dashed border-border/80 bg-card/75 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/12 p-3 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Pronto para a Fase 3</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Depois do login, podemos conectar as leituras reais do Firestore.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-6 md:p-10">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-3xl">Entrar</CardTitle>
              <CardDescription className="text-base">
                Use e-mail e senha ou Google para acessar o painel.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(handleEmailLogin)}
              >
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
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
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
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
                  <div className="rounded-[22px] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
