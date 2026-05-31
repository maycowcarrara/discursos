# Sistema de Gestão de Discursos Públicos

Aplicação web para gerenciar discursos públicos, oradores, congregações, agenda anual, histórico e notificações automáticas.

## Status Atual

Fase atual concluída:

* `FASE 1 — Base do Projeto`
* `FASE 2 — Autenticação`

Próxima fase obrigatória:

* `FASE 3 — Firestore`

## O que já foi entregue

### Base técnica

* React + Vite migrado para TypeScript
* TailwindCSS configurado
* Base compatível com `shadcn/ui`
* React Router configurado
* Layout principal com sidebar, topbar e tema claro/escuro
* Estrutura inicial de páginas por módulo
* Identidade visual administrativa alinhada ao mockup de referência
* Navegação mobile com atalhos principais no rodapé e uso confortável em toque
* Build, lint e organização base do projeto

### Autenticação

* Firebase Auth integrado
* Login por e-mail e senha
* Login com Google Popup
* Persistência de sessão
* Logout
* Rotas protegidas

### Infraestrutura Firebase

* `FIRESTORE_SCHEMA.md` criado como fonte de verdade do banco
* `firestore.rules` e `firestore.indexes.json` versionados
* `firebase.json` e `.firebaserc` configurados
* `npm run deploy:firestore`
* `npm run deploy:hosting`
* `npm run deploy:all`

## Próxima fase

### `FASE 3 — Firestore`

Implementar:

* camada `services/firestore`
* tipagens TypeScript das coleções oficiais
* hooks reutilizáveis de leitura e escrita
* leitura inicial de `settings`
* primeiros serviços para `congregations`, `themes` e `speakers`

## Diretriz de UI e UX

Este app deve funcionar bem em desktop e mobile.

Regra do projeto:

* não tratar mobile como adaptação tardia
* toda tela nova deve nascer com boa usabilidade em desktop e mobile
* menus, listas, formulários, filtros e ações principais devem ser confortáveis no toque
* fluxos críticos devem ser validados visualmente em largura mobile e desktop

## Ordem obrigatória de leitura para implementação

1. `AGENTS.md`
2. `IMPLEMENTATION_PLAN.md`
3. `FIRESTORE_SCHEMA.md`

## Scripts principais

* `npm run dev`
* `npm run build`
* `npm run lint`
* `npm run deploy:firestore`
* `npm run deploy:hosting`
* `npm run deploy:all`
