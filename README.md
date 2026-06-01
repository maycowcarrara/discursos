# Sistema de Gestão de Discursos Públicos

Aplicação web para gerenciar discursos públicos, oradores, congregações, agenda anual, histórico e notificações automáticas.

## Status Atual

Fases concluídas:

* `FASE 1 — Base do Projeto`
* `FASE 2 — Autenticação`
* `FASE 3 — Firestore`
* `FASE 4 — Congregações`
* `FASE 5 — Temas`
* `FASE 6 — Oradores`
* `FASE 7 — Calendário Inteligente`
* `FASE 8 — Designações`
* `FASE 9 — Dashboard`
* `FASE 10 — Histórico`

Fase atual concluída:

* `FASE 10 — Histórico`

Próxima etapa obrigatória:

* `FASE 11 — EmailJS`

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
* unicidade de número protegida por reserva transacional em `themeNumbers`
* bloqueio de retirada da base ativa enquanto houver oradores operacionais vinculados

### Fechamento da Fase 6

* CRUD completo de `speakers` na UI
* formulário validado com React Hook Form + Zod
* múltiplos temas por orador com seleção administrativa
* filtros locais por congregação, status e tipo
* período de indisponibilidade com datas inicial e final
* exclusão lógica com preservação do cadastro para histórico
* auditoria de create, update e delete em `auditLogs`

### Fechamento da Fase 7

* gestão anual real de `calendarEvents` na UI
* geração automática de sábados ausentes por ano
* suporte administrativo aos tipos de evento oficiais
* bloqueio automático de designações para congresso e assembleia
* visão anual por mês com destaque para eventos já designados
* arquivamento lógico e auditoria de create, update e delete

### Fechamento da Fase 8

* operação real de `assignments` na UI
* entrada de visitantes, saída de locais e designação local no mesmo fluxo
* confirmação manual com preservação de histórico
* substituição automática da cobertura operacional anterior no mesmo evento
* edição de status, observações, orador, tema e destino com auditoria
* bloqueios das regras oficiais de tema, evento bloqueado e indisponibilidade
* alerta de uso recente de tema no fluxo operacional

### Fechamento da Fase 9

* dashboard principal ligado a leituras reais de `calendarEvents`, `assignments`, `congregations` e `settings/app`
* janela com os próximos 8 sábados sem depender dos mocks iniciais
* métricas operacionais de pendências, sem designação, aguardando resposta e próximos eventos especiais
* destaque do próximo sábado com status atual, tipo de evento, orador, congregação e tema quando houver cobertura
* painel de pendências priorizando lacunas de designação e confirmações abertas
* listagem dos próximos eventos especiais, congressos, assembleias e visitas futuras

### Fechamento da Fase 10

* histórico permanente ligado a `assignments` com consulta real por período
* filtros por tema, orador e congregação sem criar coleção paralela
* linha do tempo agrupada por mês, pronta para leitura rápida em desktop e mobile
* atalho para ano atual e carregamento progressivo do histórico
* métricas dos registros carregados, confirmados, pendentes e congregações envolvidas

## Próxima fase

### `FASE 11 — EmailJS`

Implementar:

* envio automático
* lembrete 7 dias
* lembrete 1 dia
* confirmação via link

Entregue até a Fase 10:

* `settings/app` com persistência real
* CRUD completo de `congregations`
* CRUD completo de `themes`
* CRUD completo de `speakers`
* calendário inteligente com geração automática de sábados
* gestão anual real de `calendarEvents`
* leitura real de `assignments`, `notifications` e `auditLogs`
* operação real de designações com confirmações, substituições e auditoria
* dashboard operacional com próximos 8 sábados, pendências e eventos especiais
* histórico permanente com filtros por período, tema, orador e congregação

Próximo subpasso obrigatório:

* iniciar a `FASE 11 — EmailJS`

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
