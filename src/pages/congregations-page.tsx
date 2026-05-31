import { FeaturePage } from '@/pages/feature-page'

export function CongregationsPage() {
  return (
    <FeaturePage
      badge="Congregacoes"
      title="Cadastro da base local e das congregacoes visitantes"
      description="Aqui entram os dados estruturais para agenda, origem de oradores e exibicao de detalhes logísticos."
      highlights={[
        'Campos previstos no schema: name, address, city, state, zipCode, mapsUrl, meetingDay e meetingTime',
        'Filtro por status e distincao entre base local e externa via isLocal',
        'Preparado para listagem paginada e busca sem multiplicar leituras',
        'Relacionamento oficial com speakers e assignments por congregationId',
      ]}
      aside={
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            A V1 pede CRUD completo, busca, edicao e exclusao controlada.
          </p>
          <p>
            Na Fase 4, esta tela deve conversar com servicos tipados em vez de
            montar consultas direto na UI.
          </p>
        </div>
      }
    />
  )
}
