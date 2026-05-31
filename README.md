# Sistema de Gestão de Discursos Públicos

Aplicação web para gerenciar discursos públicos, oradores, congregações, agenda anual, histórico e notificações automáticas.

## Status Atual

Fases concluídas:

* `FASE 1 — Base do Projeto`
* `FASE 2 — Autenticação`
* `FASE 3 — Firestore`
* `FASE 4 — Congregações`
* `FASE 5 — Temas`

Fase atual concluída:

* `FASE 5 — Temas`

Próxima etapa obrigatória:

* `FASE 6 — Oradores`

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
* frontend padronizado para `Firebase Hosting`
* `npm run deploy:firestore`
* `npm run deploy:hosting`
* `npm run deploy:all`

### Início da Fase 3

* tipagem TypeScript estrita para as coleções oficiais do Firestore
* camada `services/firestore` criada
* hooks reutilizáveis com TanStack Query para leitura inicial
* `settings/app` conectado ao Firestore com leitura e salvamento
* páginas de `congregations`, `themes` e `speakers` conectadas ao Firestore em modo leitura

### Avanço da Fase 3

* `calendarEvents` conectado ao app com leitura anual real
* `assignments` conectado ao app para agenda e histórico recente
* telas de agenda, designações e histórico passaram a ler a base real

### Fechamento da Fase 3

* `notifications` conectado ao app com leitura real por status
* `auditLogs` conectado ao app com leitura real recente
* tela de configurações consolidada como painel da fundação Firestore

### Fechamento da Fase 4

* CRUD completo de `congregations` na UI
* formulário validado com React Hook Form + Zod
* busca local e paginação sobre a base ativa
* exclusão lógica via `isActive`
* auditoria de create, update e delete em `auditLogs`

### Fechamento da Fase 5

* CRUD completo de `themes` na UI
* formulário validado com React Hook Form + Zod
* controle administrativo de ativo/inativo
* busca rápida local por número, título e observações
* ordenação oficial por número na listagem
* exclusão lógica via `isActive`
* auditoria de create, update e delete em `auditLogs`

## Próxima fase

### `FASE 6 — Oradores`

Implementar:

* CRUD de oradores
* múltiplos temas por orador
* filtro por congregação
* filtro por status

Entregue até a Fase 5:

* `settings/app` com persistência real
* CRUD completo de `congregations`
* CRUD completo de `themes`
* listagens reais de `speakers`
* agenda anual real com `calendarEvents`
* leitura real de `assignments`, `notifications` e `auditLogs`

Próximo subpasso obrigatório:

* iniciar os CRUDs da `FASE 6 — Oradores`

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

## Decisão atual de deploy

Para manter a operação mais simples nesta V1:

* o frontend web permanece em `Firebase Hosting`
* `Cloudflare Workers` e `Cloudflare Cron Triggers` ficam reservados para automações futuras
* `Cloudflare Pages` não faz parte do deploy atual
