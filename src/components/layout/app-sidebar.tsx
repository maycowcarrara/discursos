import { useState } from 'react'
import { ChevronLeft, LoaderCircle, LogOut, MicVocal, RefreshCw, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { AvatarBadge } from '@/components/app/avatar-badge'
import { useAuth } from '@/components/auth/use-auth'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import { navigationItems } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth/auth-service'
import {
  appVersion,
  getPublishedAppVersion,
  refreshApp,
} from '@/services/app/app-version-service'

type AppSidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
  onMobileClose?: () => void
  desktopExpanded?: boolean
  onDesktopExpandedChange?: (expanded: boolean) => void
}

export function AppSidebar({
  mobile = false,
  onNavigate,
  onMobileClose,
  desktopExpanded = true,
  onDesktopExpandedChange,
}: AppSidebarProps) {
  const { user } = useAuth()
  const toast = useToast()
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const [versionCheckPending, setVersionCheckPending] = useState(false)
  const expanded = mobile || desktopExpanded

  async function handleConfirmLogout() {
    if (logoutPending) {
      return
    }

    setLogoutPending(true)

    try {
      await logout()
    } catch {
      setLogoutPending(false)
    }
  }

  async function handleVersionCheck() {
    if (versionCheckPending) {
      return
    }

    setVersionCheckPending(true)

    try {
      const publishedVersion = await getPublishedAppVersion()

      if (publishedVersion === appVersion) {
        toast.success(`Você já está usando a versão mais recente (${appVersion}).`)
        setVersionCheckPending(false)
        return
      }

      toast.success(`Nova versão ${publishedVersion} encontrada. Atualizando...`)
      await refreshApp()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Não foi possível verificar a versão agora.'
      toast.error(message)
      setVersionCheckPending(false)
    }
  }

  return (
    <>
      <aside
        className={cn(
          'flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-300 ease-in-out',
          mobile
            ? 'w-72 border-l border-blue-500/30'
            : 'h-full min-h-0 border-r border-blue-500/30',
        )}
      >
        <div
          className={cn(
            'relative flex h-16 shrink-0 items-center border-b border-blue-500/30 text-white',
            expanded ? 'justify-between px-4' : 'justify-center px-1',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 items-center overflow-hidden',
              expanded ? 'gap-3' : 'justify-center',
            )}
          >
            <MicVocal
              className={cn('shrink-0 text-blue-200', expanded ? 'size-6' : 'size-7')}
              strokeWidth={2.5}
            />
            <div className={cn('min-w-0', !expanded && 'hidden')}>
              <h1 className="truncate text-lg font-black tracking-tight text-white">
                Discursos
              </h1>
              <p className="truncate text-[10px] font-bold uppercase text-blue-200">
                Gestão pública
              </p>
            </div>
          </div>

          {!mobile ? (
            <button
              type="button"
              className="hidden rounded p-1 text-blue-100 transition-colors hover:bg-blue-700 hover:text-white lg:block"
              onClick={() => onDesktopExpandedChange?.(!desktopExpanded)}
              aria-label={desktopExpanded ? 'Recolher menu' : 'Expandir menu'}
              title={desktopExpanded ? 'Recolher menu' : 'Expandir menu'}
            >
              <ChevronLeft
                className={cn('size-5 transition-transform', !desktopExpanded && 'rotate-180')}
              />
            </button>
          ) : (
            <button
              type="button"
              className="rounded p-1 text-blue-100 transition-colors hover:bg-blue-700 hover:text-white"
              onClick={onMobileClose}
              aria-label="Fechar menu"
              title="Fechar menu"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-4">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex w-full items-center justify-between border-l-4 px-4 py-3 transition-colors',
                    isActive
                      ? 'border-white bg-blue-800 text-white'
                      : 'border-transparent text-blue-100 hover:bg-blue-700 hover:text-white',
                    !expanded && 'justify-center px-0',
                  )
                }
                title={expanded ? undefined : item.label}
                aria-label={item.label}
              >
                {() => (
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="size-[18px] shrink-0" />
                    {expanded ? (
                      <p className="min-w-0 truncate text-sm font-medium">{item.label}</p>
                    ) : null}
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-blue-500/30 bg-blue-900/40 p-4',
            !expanded && 'px-2',
          )}
        >
          {expanded ? (
            <div className="mb-2 rounded-lg border border-blue-700/50 bg-blue-800/50 p-2">
              <div className="flex items-center gap-2.5">
                <AvatarBadge
                  name={user?.displayName ?? 'Administrador'}
                  photoUrl={user?.photoURL ?? null}
                  size="sm"
                  className="ring-1 ring-blue-300"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.displayName ?? 'Administrador'}
                  </p>
                  <p className="truncate text-[11px] text-white/72">
                    {user?.email ?? 'admin@congregacao.org'}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-blue-600/45 pt-2">
                <span className="shrink-0 text-[10px] font-semibold text-blue-100">
                  Versão {appVersion}
                </span>
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-blue-100 transition-colors hover:bg-blue-700 hover:text-white disabled:cursor-wait disabled:opacity-70"
                  onClick={() => void handleVersionCheck()}
                  disabled={versionCheckPending}
                  aria-label="Verificar versão e atualizar"
                >
                  {versionCheckPending ? (
                    <LoaderCircle className="size-3 shrink-0 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3 shrink-0" />
                  )}
                  <span className="truncate">
                    {versionCheckPending ? 'Verificando...' : 'Verificar e atualizar'}
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          <div className={cn('flex items-center gap-2', !expanded && 'flex-col')}>
            <ThemeToggle
              size="icon"
              className="size-9 shrink-0 rounded-lg border-blue-500/30 bg-blue-800/50 text-blue-100 hover:bg-blue-700 hover:text-white"
            />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 min-w-0 justify-start rounded-lg border-red-400/35 bg-red-950/35 px-3 text-red-50 hover:border-red-300/55 hover:bg-red-900/55 hover:text-white',
                expanded ? 'flex-1' : 'size-9 px-0',
              )}
              onClick={() => setLogoutConfirmationOpen(true)}
              aria-label="Sair do sistema"
              title="Sair do sistema"
            >
              <LogOut className="size-4" />
              {expanded ? <span>Sair</span> : null}
            </Button>
          </div>
        </div>
      </aside>

      <Modal
        open={logoutConfirmationOpen}
        onOpenChange={setLogoutConfirmationOpen}
      >
        <ModalContent className="max-w-sm overflow-hidden rounded-xl">
          <ModalHeader className="bg-card">
            <ModalTitle>Confirmar saída</ModalTitle>
            <ModalDescription>
              Você será desconectado do painel administrativo.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm leading-6 text-muted-foreground">
              Deseja sair agora?
            </p>
          </ModalBody>
          <ModalFooter className="flex flex-col-reverse gap-2 bg-card sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setLogoutConfirmationOpen(false)}
              disabled={logoutPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void handleConfirmLogout()}
              disabled={logoutPending}
            >
              {logoutPending ? 'Saindo...' : 'Sair'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
