import { FeaturePage } from '@/pages/feature-page'

export function ThemesPage() {
  return (
    <FeaturePage
      badge="Temas"
      title="Catalogo oficial dos discursos por numero e titulo"
      description="Esta area fica preparada para ordenacao numerica, status ativo e controle de historico sem naming duplicado."
      highlights={[
        'Estrutura oficial: number, title, isActive e notes',
        'Busca rapida e ordenacao por numero previstas no plano',
        'O schema explicita que tema usa title, nunca name',
        'Base pronta para alertas de repeticao por historico em assignments',
      ]}
      aside={
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            O ideal aqui e manter o cadastro enxuto e usar a inteligencia
            historica no modulo de designacoes.
          </p>
        </div>
      }
    />
  )
}
