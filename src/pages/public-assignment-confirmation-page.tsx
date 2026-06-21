import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MailCheck,
  RefreshCcw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  confirmAssignmentByPublicLink,
  getPublicAssignmentConfirmation,
  type PublicAssignmentConfirmationResponse,
} from '@/services/public/assignment-confirmation-service'
import { assignmentStatusLabels } from '@/utils/calendar-events'

type RequestState = {
  isLoading: boolean
  payload: PublicAssignmentConfirmationResponse | null
  error: string | null
}

const initialState: RequestState = {
  isLoading: true,
  payload: null,
  error: null,
}

function getStateTone(state: PublicAssignmentConfirmationResponse['state']) {
  if (state === 'confirmed') {
    return 'success'
  }

  if (state === 'pending') {
    return 'pending'
  }

  return 'warning'
}

function getStateBadgeClassName(state: PublicAssignmentConfirmationResponse['state']) {
  if (state === 'confirmed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (state === 'pending') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'
  }

  return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
}

function getStateLabel(state: PublicAssignmentConfirmationResponse['state']) {
  if (state === 'pending') {
    return 'Aguardando confirmação'
  }

  if (state === 'confirmed') {
    return 'Confirmação concluída'
  }

  if (state === 'conflict') {
    return 'Data já remanejada'
  }

  if (state === 'inactive') {
    return 'Designação encerrada'
  }

  return 'Link inválido'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível validar o link de confirmação.'
}

export function PublicAssignmentConfirmationPage() {
  const [searchParams] = useSearchParams()
  const [requestState, setRequestState] = useState<RequestState>(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const assignmentId = searchParams.get('assignmentId')?.trim() ?? ''
  const token = searchParams.get('token')?.trim() ?? ''
  const hasRequiredParams = assignmentId.length > 0 && token.length > 0

  const loadPreview = useCallback(async () => {
    if (!hasRequiredParams) {
      setRequestState({
        isLoading: false,
        payload: {
          assignment: null,
          message: 'Este link está incompleto ou foi alterado.',
          state: 'invalid',
        },
        error: null,
      })
      return
    }

    setRequestState({
      isLoading: true,
      payload: null,
      error: null,
    })

    try {
      const payload = await getPublicAssignmentConfirmation({
        assignmentId,
        token,
      })

      setRequestState({
        isLoading: false,
        payload,
        error: null,
      })
    } catch (error) {
      setRequestState({
        isLoading: false,
        payload: null,
        error: getErrorMessage(error),
      })
    }
  }, [assignmentId, hasRequiredParams, token])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  const tone = useMemo(() => {
    if (!requestState.payload) {
      return 'pending' as const
    }

    return getStateTone(requestState.payload.state)
  }, [requestState.payload])

  async function handleConfirm() {
    if (!hasRequiredParams) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = await confirmAssignmentByPublicLink({
        assignmentId,
        token,
      })

      setRequestState({
        isLoading: false,
        payload,
        error: null,
      })
    } catch (error) {
      setRequestState((currentState) => ({
        isLoading: false,
        payload: currentState.payload,
        error: getErrorMessage(error),
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center">
        <div className="w-full">
          <Card className="rounded-xl border-border bg-card shadow-sm">
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Resumo da designação</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6">
                    A confirmação só é aplicada quando este link ainda representa a designação atual.
                  </CardDescription>
                </div>
                {requestState.payload ? (
                  <Badge className={getStateBadgeClassName(requestState.payload.state)}>
                    {getStateLabel(requestState.payload.state)}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {requestState.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-xl border border-border bg-background"
                    />
                  ))}
                </div>
              ) : null}

              {!requestState.isLoading && requestState.error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {requestState.error}
                </div>
              ) : null}

              {!requestState.isLoading && requestState.payload ? (
                <>
                  <div
                    className={[
                      'rounded-xl border px-5 py-4',
                      tone === 'success'
                        ? 'border-emerald-200 bg-emerald-50/90 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                        : tone === 'pending'
                          ? 'border-sky-200 bg-sky-50/90 dark:border-sky-500/20 dark:bg-sky-500/10'
                          : 'border-amber-200 bg-amber-50/90 dark:border-amber-500/20 dark:bg-amber-500/10',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      {requestState.payload.state === 'confirmed' ? (
                        <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-300" />
                      ) : requestState.payload.state === 'pending' ? (
                        <MailCheck className="mt-0.5 size-5 text-sky-600 dark:text-sky-300" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-5 text-amber-700 dark:text-amber-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {requestState.payload.message}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          A confirmação respeita o histórico e só é aplicada se esta data continuar reservada para você.
                        </p>
                      </div>
                    </div>
                  </div>

                  {requestState.payload.assignment ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background px-4 py-3.5">
                        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                          Orador
                        </p>
                        <p className="mt-2 text-base font-medium text-foreground">
                          {requestState.payload.assignment.speakerName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Status atual:{' '}
                          {assignmentStatusLabels[requestState.payload.assignment.status]}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-background px-4 py-3.5">
                        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                          Data
                        </p>
                        <p className="mt-2 text-base font-medium text-foreground">
                          {requestState.payload.assignment.eventDateLabel}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Destino: {requestState.payload.assignment.localCongregationName}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-background px-4 py-3.5">
                        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                          Congregação de origem
                        </p>
                        <p className="mt-2 text-base font-medium text-foreground">
                          {requestState.payload.assignment.originCongregationName}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-background px-4 py-3.5">
                        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                          Tema
                        </p>
                        <p className="mt-2 text-base font-medium text-foreground">
                          {requestState.payload.assignment.themeNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {requestState.payload.assignment.themeTitle}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 className="size-4" />
                      <span>Você pode voltar a este link mais tarde, se precisar revisar o status.</span>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button variant="outline" onClick={() => void loadPreview()}>
                        <RefreshCcw className="size-4" />
                        Atualizar status
                      </Button>
                      {requestState.payload.state === 'pending' ? (
                        <Button onClick={() => void handleConfirm()} disabled={isSubmitting}>
                          <CheckCircle2 className="size-4" />
                          {isSubmitting ? 'Confirmando...' : 'Confirmar designação'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}

              <div className="pt-2 text-sm text-muted-foreground">
                <Link className="font-medium text-primary" to="/login">
                  Voltar ao sistema
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
