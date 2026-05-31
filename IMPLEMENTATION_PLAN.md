# IMPLEMENTATION_PLAN.md

# Sistema de Gestão de Discursos Públicos

## Plano Oficial de Implementação

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
* Cloudflare Workers
* Cloudflare Cron Triggers
* Cloudflare Pages

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
* Toda automação deve usar Cloudflare Workers
* TypeScript obrigatório
* Nunca usar "any"
* Componentes reutilizáveis
* Separar camada de UI da lógica de negócio
* Validar formulários com Zod

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

Implementar:

* React + Vite + TS
* Tailwind
* Shadcn/UI
* React Router
* Layout principal
* Sidebar
* Topbar
* Tema claro/escuro
* Estrutura responsiva

Critérios de aceite:

* Projeto buildando
* Navegação funcionando
* Layout desktop funcional

---

## FASE 2 — Autenticação

Implementar:

* Firebase Auth
* Login
* Logout
* Persistência de sessão
* Rotas protegidas

Critérios:

* Usuário autenticado acessa dashboard
* Usuário não autenticado é redirecionado

---

## FASE 3 — Firestore

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

---

## FASE 4 — Congregações

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

---

## FASE 5 — Temas

Implementar CRUD.

Campos:

* número
* título
* ativo
* observações

Adicionar:

* busca rápida
* ordenação por número

---

## FASE 6 — Oradores

Implementar CRUD.

Campos:

* nome
* email
* telefone
* congregationId
* type
* themes[]
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

---

## FASE 7 — Calendário Inteligente

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

---

## FASE 8 — Designações

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

Implementar:

* próximos 8 sábados
* pendências
* sem designação
* aguardando resposta
* próximos eventos especiais

---

## FASE 10 — Histórico

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
* desktop-first

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
