import { FeaturePage } from '@/pages/feature-page'

export function HistoryPage() {
  return (
    <FeaturePage
      badge="Historico"
      title="Linha do tempo permanente de discursos, respostas e auditoria"
      description="O modulo de historico vai consolidar o que aconteceu e o que mudou, sem apagar rastros importantes."
      highlights={[
        'Filtros previstos por tema, orador, congregacao e periodo',
        'Assignments preservam contexto operacional para consultas antigas',
        'auditLogs cobre create, update, delete, statusChange e sync',
        'A politica da V1 e append-only para auditoria e sem apagar historico',
      ]}
      aside={
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Historico confiavel e o que impede o sistema de virar uma planilha
            paralela de novo.
          </p>
        </div>
      }
    />
  )
}
