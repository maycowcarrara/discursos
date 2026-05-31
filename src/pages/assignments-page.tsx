import { FeaturePage } from '@/pages/feature-page'

export function AssignmentsPage() {
  return (
    <FeaturePage
      badge="Designacoes"
      title="Fluxo de pendencia, confirmacao, substituicao e historico operacional"
      description="Esta rota vai receber o coracao da operacao: cada designacao com snapshots minimos para manter o passado legivel."
      highlights={[
        'Assignments salvam snapshots como speakerName, themeTitle e originCongregationName',
        'Status oficial: pending, confirmed, declined, cancelled e replaced',
        'A integridade exige que o tema exista em speakers.themeIds',
        'Historico nao deve ser apagado; cancelamento muda status',
      ]}
      aside={
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            O schema foi pensado para evitar depender sempre dos documentos
            atuais do orador ou do tema ao consultar eventos antigos.
          </p>
        </div>
      }
    />
  )
}
