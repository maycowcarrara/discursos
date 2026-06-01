# IMPLEMENTATION_PLAN.md

# Sistema de Gestão de Discursos Públicos

## Plano Oficial de Implementação

---

# Status Atual do Projeto

## Fases concluídas

* FASE 1 — Base do Projeto
* FASE 2 — Autenticação
* FASE 3 — Firestore
* FASE 4 — Congregações
* FASE 5 — Temas
* FASE 6 — Oradores
* FASE 7 — Calendário Inteligente

## Fase atual concluída

* FASE 7 — Calendário Inteligente

## Próxima etapa obrigatória

* FASE 8 — Designações

## Entregas já realizadas

### Infra e base

* React + Vite migrado para TypeScript
* TailwindCSS configurado
* Base compatível com Shadcn/UI
* React Router configurado
* Layout principal com sidebar, topbar e tema claro/escuro
* Estrutura inicial de páginas por módulo
* Identidade visual administrativa alinhada ao mockup de referência
* Navegação mobile com atalhos principais no rodapé e prioridade real para toque
* Frontend padronizado para deploy em Firebase Hosting

### Autenticação

* Firebase Auth integrado
* Login com e-mail e senha
* Login com Google Popup
* Persistência de sessão
* Logout
* Rotas protegidas

### Infraestrutura Firebase

* `FIRESTORE_SCHEMA.md` criado
* `firebase.json` configurado
* `firestore.rules` versionado
* `firestore.indexes.json` versionado
* scripts de deploy criados

### Firestore — início da Fase 3

* tipagem TypeScript estrita das coleções oficiais
* base `services/firestore` criada
* hooks reutilizáveis com TanStack Query para leitura inicial
* leitura e escrita inicial de `settings/app`
* páginas de `congregations`, `themes` e `speakers` conectadas ao Firestore em modo leitura

### Firestore — avanço da Fase 3

* `calendarEvents` conectado ao app com navegação anual por ano
* `assignments` conectado ao app com leitura de histórico recente
* agenda anual cruza `calendarEvents` com `assignments` para indicar onde já existe designação
* páginas de agenda, designações e histórico deixaram de depender de mocks principais

### Firestore — fechamento da Fase 3

* `notifications` conectado ao app com leitura real da fila operacional
* `auditLogs` conectado ao app com leitura real da trilha de auditoria
* tela de configurações consolidada como painel de fundação do Firestore

### Congregações — fechamento da Fase 4

* CRUD completo de `congregations` implementado na UI
* cadastro e edição com validação tipada via React Hook Form + Zod
* exclusão lógica via `isActive`, preservando integridade e histórico operacional
* busca local por nome, cidade, UF, endereço e dia de reunião
* paginação local sobre a lista ativa para evitar leituras extras no Firestore
* auditoria automática de create, update e delete em `auditLogs`

### Temas — fechamento da Fase 5

* CRUD completo de `themes` implementado na UI
* cadastro e edição com validação tipada via React Hook Form + Zod
* controle administrativo de `isActive` com reativação por edição
* exclusão lógica com remoção da base ativa e preservação do histórico
* busca rápida local por número, título e observações
* ordenação oficial por número mantida na listagem administrativa
* auditoria automática de create, update e delete em `auditLogs`

### Oradores — fechamento da Fase 6

* CRUD completo de `speakers` implementado na UI
* cadastro e edição com validação tipada via React Hook Form + Zod
* múltiplos temas por orador com seleção administrativa real
* filtros locais por congregação, status e tipo sem leituras extras
* controle operacional de status com indisponibilidade por período
* exclusão lógica com saída da base ativa e preservação do cadastro
* auditoria automática de create, update e delete em `auditLogs`

### Calendário Inteligente — fechamento da Fase 7

* gestão anual real de `calendarEvents` implementada na UI
* geração automática dos sábados ausentes por ano, sem duplicar eventos ativos
* cadastro e edição tipados para discurso, congresso, assembleia, visita e especial
* bloqueio automático de designações para congresso e assembleia via `blocksAssignments`
* visão anual por mês com cruzamento leve entre `calendarEvents` e `assignments`
* arquivamento lógico com reativação por edição e auditoria para create, update e delete
* bloqueios de integridade para não mover ou arquivar eventos já vinculados a designações

Regra de manutenção desta documentação:

* sempre atualizar esta seção quando uma fase for concluída
* sempre deixar explícita a próxima fase obrigatória

---

# Objetivo

Desenvolver um sistema web para gerenciamento de:

* Discursos públicos
* Oradores locais
* Oradores visitantes
* Congregações
* Agenda anual
* Histórico
* Notificações automáticas
* Integração Google Calendar

O sistema deve operar prioritariamente dentro de serviços gratuitos.

---

# Stack Obrigatória

## Frontend

* React
* TypeScript
* Vite
* React Router
* Shadcn/UI
* TailwindCSS
* TanStack Query
* React Hook Form
* Zod

---

# Backend e Infraestrutura

* Firebase Authentication
* Cloud Firestore
* Firebase Hosting
* Cloudflare Workers
* Cloudflare Cron Triggers

---

# Integrações

* EmailJS
* Google Calendar API
* Google Maps URL

---

# Regras Arquiteturais

## Obrigatórias

* Não utilizar backend Node tradicional
* Não utilizar servidor VPS
* Todo armazenamento deve usar Firestore
* O frontend web deve usar Firebase Hosting como hospedagem padrão desta V1
* Toda automação deve usar Cloudflare Workers
* TypeScript obrigatório
* Nunca usar "any"
* Componentes reutilizáveis
* Separar camada de UI da lógica de negócio
* Validar formulários com Zod
* Toda fase deve considerar desktop e mobile como plataformas obrigatórias
* Não tratar UX mobile como adaptação tardia

---

# Estrutura de Pastas

/src

/components
/pages
/layouts
/services
/hooks
/lib
/types
/utils
/store

---

# Funcionalidades da Versão 1

## FASE 1 — Base do Projeto

Objetivo:

Criar estrutura inicial.

Status atual:

* Concluída

Implementar:

* React + Vite + TS
* Tailwind
* Shadcn/UI
* React Router
* Layout principal
* Sidebar
* Topbar
* Tema claro/escuro
* Estrutura responsiva com boa usabilidade em desktop e mobile

Critérios de aceite:

* Projeto buildando
* Navegação funcionando
* Layout desktop funcional
* Layout mobile funcional
* Menu e ações principais acessíveis em toque

---

## FASE 2 — Autenticação

Status atual:

* Concluída

Implementar:

* Firebase Auth
* Login
* Logout
* Persistência de sessão
* Rotas protegidas

Critérios:

* Usuário autenticado acessa dashboard
* Usuário não autenticado é redirecionado
* Fluxo de autenticação utilizável em desktop e mobile

---

## FASE 3 — Firestore

Status atual:

* Concluída

Implementar coleções:

* settings
* congregations
* speakers
* themes
* calendarEvents
* assignments
* notifications
* auditLogs

Criar:

* services/firestore
* tipagem TypeScript
* hooks reutilizáveis

Entregas desta fase:

* `settings/app` com leitura e salvamento real
* `congregations`, `themes` e `speakers` em leitura real
* validação de documentos via tipagem estrita no frontend
* `calendarEvents` em leitura real por ano
* `assignments` em leitura real para agenda e histórico
* `notifications` em leitura real por status
* `auditLogs` em leitura real recente

Ordem sugerida dentro da fase:

1. `settings`
2. `congregations`
3. `themes`
4. `speakers`
5. `calendarEvents`
6. `assignments`
7. `notifications`
8. `auditLogs`

---

## FASE 4 — Congregações

Status atual:

* Concluída

Implementar CRUD completo.

Campos:

* nome
* endereço
* cidade
* estado
* CEP
* mapsUrl
* meetingDay
* meetingTime
* observações
* isLocal

Critérios:

* Cadastro
* Edição
* Exclusão
* Busca
* Paginação

Entregas realizadas:

* formulário completo com validação estrita
* listagem com busca local e paginação
* edição em tela
* exclusão lógica com remoção da base ativa
* bloqueio de exclusão quando houver oradores vinculados
* geração de auditoria para create, update e delete

---

## FASE 5 — Temas

Status atual:

* Concluída

Implementar CRUD.

Campos:

* número
* título
* ativo
* observações

Adicionar:

* busca rápida
* ordenação por número

Entregas realizadas:

* formulário completo com validação estrita
* listagem administrativa real com itens ativos e inativos
* edição em tela com controle de status ativo/inativo
* exclusão lógica via `isActive`
* busca local rápida por número, título e observações
* auditoria para create, update e delete

---

## FASE 6 — Oradores

Status atual:

* Concluída

Implementar CRUD.

Campos:

* nome
* email
* telefone
* congregationId
* type
* themeIds[]
* status
* unavailableStart
* unavailableEnd
* notes

Status:

* ativo
* férias
* indisponível
* transferido
* inativo

Critérios:

* múltiplos temas
* filtro por congregação
* filtro por status

Entregas realizadas:

* formulário completo com validação estrita
* vinculação de múltiplos temas por orador
* controle administrativo de status ativo, férias, indisponível, transferido e inativo
* período de indisponibilidade com datas inicial e final
* listagem administrativa real com filtros locais por tipo, congregação e status
* exclusão lógica com `status = inactive` e `isActive = false`
* auditoria para create, update e delete

---

## FASE 7 — Calendário Inteligente

Status atual:

* Concluída

Implementar:

* geração automática de sábados
* calendário anual
* tipos de evento

Tipos:

* discurso
* congresso
* assembleia
* visita
* especial

Critérios:

* bloquear designações em congresso
* bloquear designações em assembleia

Entregas realizadas:

* geração automática dos sábados de cada ano sob demanda
* CRUD administrativo real de `calendarEvents` com validação estrita
* suporte aos tipos `publicTalk`, `congress`, `assembly`, `visit` e `special`
* bloqueio automático de designações em congressos e assembleias
* visão anual por mês com indicação de eventos já designados
* exclusão lógica com preservação administrativa do histórico do calendário
* auditoria para create, update e delete

---

## FASE 8 — Designações

Status atual:

* Próxima fase obrigatória

Implementar:

* entrada de visitantes
* saída de locais
* status
* observações
* confirmação

Status:

* pendente
* confirmado
* recusado
* cancelado
* substituído

---

## FASE 9 — Dashboard

Status atual:

* Pendente

Implementar:

* próximos 8 sábados
* pendências
* sem designação
* aguardando resposta
* próximos eventos especiais

---

## FASE 10 — Histórico

Status atual:

* Pendente

Implementar filtros:

* tema
* orador
* congregação
* período

Implementar:

* linha do tempo
* histórico permanente

---

## FASE 11 — EmailJS

Status atual:

* Pendente

Implementar:

* envio automático
* lembrete 7 dias
* lembrete 1 dia
* confirmação via link

Utilizar:

* Cloudflare Workers
* Cloudflare Cron

IMPORTANTE:

Não expor chaves sensíveis no frontend.

---

## FASE 12 — Google Calendar

Status atual:

* Pendente

Implementar:

* criação automática
* atualização
* exclusão
* sincronização

---

# Regras de Negócio

## RN001

Não permitir designar tema que o orador não possui.

---

## RN002

Não permitir designação em congressos.

---

## RN003

Não permitir designação em assembleias.

---

## RN004

Salvar auditoria de alterações.

---

## RN005

Nunca apagar histórico.

---

## RN006

Oradores indisponíveis devem gerar alerta.

---

## RN007

Mostrar alerta quando tema foi utilizado recentemente.

---

# Planejamento Anual

A tela principal deve mostrar:

* ano inteiro
* status visual
* eventos especiais
* sábados vazios
* pendências

Esta é a principal funcionalidade do sistema.

---

# UI Guidelines

Visual:

* limpo
* administrativo
* minimalista
* rápido
* claro para uso frequente em desktop e mobile

Obrigatório:

* mobile é prioridade real de UX junto com desktop
* toda nova tela deve ser pensada para toque, leitura rápida e ações principais sem esforço
* filtros, formulários e listas devem funcionar bem em largura reduzida
* não aceitar uma implementação como pronta se só estiver boa no desktop

Evitar:

* animações excessivas
* efeitos pesados
* excesso de cores

---

# Performance

Objetivos:

* primeira carga < 2s
* consultas rápidas
* mínimo de leituras Firestore

---

# Decisão Atual de Infraestrutura

Para manter a operação simples nesta V1:

* o frontend permanece em `Firebase Hosting`
* `Cloudflare Workers` e `Cloudflare Cron Triggers` ficam reservados para automações e rotinas agendadas
* não há adoção de `Cloudflare Pages` no escopo atual

---

# Critério Final de Sucesso

O organizador deve conseguir:

* visualizar o ano inteiro
* identificar pendências rapidamente
* evitar repetição de temas
* automatizar lembretes
* controlar visitantes e saídas
* eliminar planilhas paralelas

---

# Fluxo Obrigatório para Codex

Antes de cada implementação:

1. Ler AGENTS.md
2. Ler IMPLEMENTATION_PLAN.md
3. Ler FIRESTORE_SCHEMA.md

Nunca implementar funcionalidades fora do escopo sem autorização explícita.
