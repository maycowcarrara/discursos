import { FeaturePage } from '@/pages/feature-page'

export function CalendarPage() {
  return (
    <FeaturePage
      badge="Agenda anual"
      title="Planejamento de sabados, congressos, assembleias e eventos especiais"
      description="O shell da tela ja esta alinhado com a principal funcionalidade do sistema: visualizar o ano inteiro e enxergar bloqueios rapidamente."
      highlights={[
        'calendarEvents concentra sabados comuns e eventos especiais',
        'blocksAssignments marca datas que travam designacoes',
        'Tipos oficiais: publicTalk, congress, assembly, visit e special',
        'A fase futura deve gerar sabados automaticamente e destacar lacunas',
      ]}
      aside={
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            O calendario e o centro do produto, entao a fundacao visual ja
            deixa espaço para uma grade anual robusta.
          </p>
        </div>
      }
    />
  )
}
