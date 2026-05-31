import { FeaturePage } from '@/pages/feature-page'

export function SettingsPage() {
  return (
    <FeaturePage
      badge="Configuracoes"
      title="Preferencias globais, notificacoes e integracoes futuras"
      description="A base da tela ja separa configuracoes de aplicacao, lembretes e calendario sem misturar com dados operacionais."
      highlights={[
        'settings/app, settings/notifications e settings/calendar sao os documentos previstos',
        'Integracoes com EmailJS e Google Calendar entram nas fases futuras',
        'Chaves sensiveis nao devem ficar expostas no frontend',
        'Automacoes devem nascer pensando em Cloudflare Workers e cron',
      ]}
      aside={
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Esta tela sera importante para coordenar comportamento global sem
            espalhar flags pela interface.
          </p>
        </div>
      }
    />
  )
}
