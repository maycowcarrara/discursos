# AGENTS.md

## Objetivo

Este projeto implementa um sistema de gestao de discursos publicos com foco em operacao simples, custo baixo e consistencia de dados.

## Ordem obrigatoria de leitura

Antes de qualquer implementacao, o agente deve ler nesta ordem:

1. `AGENTS.md`
2. `IMPLEMENTATION_PLAN.md`
3. `FIRESTORE_SCHEMA.md`

## Regras de execucao

* Implementar por fases, sem pular escopo sem autorizacao explicita
* Tratar `IMPLEMENTATION_PLAN.md` como fonte oficial da entrega
* Tratar `FIRESTORE_SCHEMA.md` como fonte oficial do banco
* Manter a documentacao atualizada sempre que uma fase avancar
* Deixar explicito na documentacao o que ja foi entregue, a fase atual e a proxima fase obrigatoria
* Nao criar colecoes, campos ou enums fora do schema sem atualizar a documentacao primeiro
* Preferir componentes reutilizaveis e separacao clara entre UI, logica e servicos
* Todo codigo novo deve ser em TypeScript estrito
* Nunca usar `any`
* Priorizar leituras economicas no Firestore
* Nao introduzir backend Node tradicional
* Automacoes devem ser pensadas para Cloudflare Workers e Cron Triggers

## Convencoes da Fase 1

* Usar React Router para estrutura principal de navegacao
* Usar TailwindCSS como base visual
* Preparar base compativel com `shadcn/ui`
* Garantir boa UX em desktop e mobile desde o inicio
* Tema claro/escuro deve existir desde a base

## Convencoes de UI e UX

* Toda tela nova deve funcionar bem em desktop e mobile
* Mobile nao deve ser tratado como ajuste final
* Formularios, filtros, tabelas, cards e acoes principais devem considerar toque, largura reduzida e leitura confortavel
* Antes de considerar uma fase visualmente pronta, verificar se o fluxo principal tambem esta bom no mobile

## Convencoes de alteracao

Se uma implementacao exigir mudanca de arquitetura ou schema:

1. Atualizar a documentacao relevante
2. Explicar impacto tecnico
3. So depois implementar

## Fora de escopo sem autorizacao

* Firebase Auth completo antes da Fase 2
* Persistencia real no Firestore antes da Fase 3
* Integracoes externas alem do que a fase atual pede
* Ajustes ad hoc no banco para "destravar" tela
