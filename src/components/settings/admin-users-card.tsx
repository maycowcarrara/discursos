import { LoaderCircle, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

import { useAuth } from '@/components/auth/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useAddAdminUserMutation,
  useAdminUsersQuery,
  useRemoveAdminUserMutation,
} from '@/hooks/use-admin-users'

const emailSchema = z.email('Informe um e-mail valido.')

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Nao foi possivel atualizar os acessos administrativos.'
}

export function AdminUsersCard() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const adminUsersQuery = useAdminUsersQuery()
  const addAdminUserMutation = useAddAdminUserMutation()
  const removeAdminUserMutation = useRemoveAdminUserMutation()
  const isMutating =
    addAdminUserMutation.isPending || removeAdminUserMutation.isPending

  async function handleAddAdminUser() {
    const parsedEmail = emailSchema.safeParse(email.trim().toLowerCase())

    if (!parsedEmail.success) {
      setFormError(parsedEmail.error.issues[0]?.message ?? 'Informe um e-mail valido.')
      return
    }

    setFormError(null)
    try {
      await addAdminUserMutation.mutateAsync(parsedEmail.data)
      setEmail('')
    } catch {
      return
    }
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UsersRound className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">Acessos administrativos</CardTitle>
              <CardDescription className="mt-2 text-base">
                Aprove e-mails para login exclusivo pelo Google. A claim administrativa
                e reconciliada no primeiro acesso.
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary">
            {adminUsersQuery.data?.length ?? 0} aprovado(s)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            void handleAddAdminUser()
          }}
        >
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="novo.admin@gmail.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" disabled={isMutating}>
            {addAdminUserMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Adicionar
          </Button>
        </form>

        {formError ? (
          <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>
        ) : null}

        {adminUsersQuery.isError ||
        addAdminUserMutation.isError ||
        removeAdminUserMutation.isError ? (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {getErrorMessage(
              adminUsersQuery.error ??
                addAdminUserMutation.error ??
                removeAdminUserMutation.error,
            )}
          </div>
        ) : null}

        {adminUsersQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-[18px] border border-border/70 bg-background" />
        ) : null}

        {!adminUsersQuery.isLoading && adminUsersQuery.data?.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-border/80 bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
            Nenhum administrador aprovado. Execute o bootstrap administrativo antes
            de publicar.
          </div>
        ) : null}

        <div className="space-y-3">
          {adminUsersQuery.data?.map((adminUser) => {
            const isCurrentUser = adminUser.email === user?.email?.toLowerCase()

            return (
              <div
                key={adminUser.email}
                className="flex flex-col gap-3 rounded-[18px] border border-border/70 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {adminUser.displayName ?? adminUser.email}
                    </p>
                    {isCurrentUser ? (
                      <Badge className="bg-primary/10 text-primary">Você</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{adminUser.email}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    {adminUser.hasFirebaseAccount
                      ? adminUser.hasAdminClaim
                        ? 'Conta Google ativa com claim administrativa.'
                        : 'Conta criada; claim sera reconciliada no proximo login.'
                      : 'Aguardando primeiro login com Google.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isCurrentUser || isMutating}
                  onClick={() => {
                    removeAdminUserMutation.mutate(adminUser.email)
                  }}
                >
                  {removeAdminUserMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Excluir
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
