import { FeaturePage } from '@/pages/feature-page'

export function SpeakersPage() {
  return (
    <FeaturePage
      badge="Oradores"
      title="Cadastro de locais e visitantes com temas e indisponibilidade"
      description="A tela foi posicionada para receber filtros por congregacao, status e temas sem quebrar a consistencia do schema."
      highlights={[
        'type oficial: local ou visitor',
        'status oficial: active, vacation, unavailable, transferred ou inactive',
        'themeIds como relacionamento leve com themes, sem objetos embutidos',
        'Janela de indisponibilidade prevista com unavailableStart e unavailableEnd',
      ]}
      aside={
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            O schema evita o erro comum de salvar temas completos dentro do
            orador.
          </p>
          <p>
            Isso reduz retrabalho quando chegarmos nos filtros e nas regras de
            designacao.
          </p>
        </div>
      }
    />
  )
}
