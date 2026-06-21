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
* FASE 8 — Designações
* FASE 9 — Dashboard
* FASE 10 — Histórico
* FASE 11 — EmailJS
* FASE 12 — Google Calendar

## Última fase concluída

* FASE 12 — Google Calendar

## Etapa atual em andamento

* Refatoração V1 — fluxo direto de designação dos sábados

## Próxima etapa obrigatória

* Validar o fluxo Dashboard → Designações em desktop e mobile antes do checklist operacional de lançamento V1

## Frente ativa de qualidade do lançamento

* simplificação do modelo operacional para designar discurso público em cada sábado, escolhendo orador e tema
* remoção da aba Agenda como cadastro genérico de eventos, preservando `calendarEvents` apenas como suporte técnico para sábados, exceções, bloqueios e Google Calendar
* hardening pós-varredura do fluxo Dashboard → Designações, incluindo handoff de virada de ano com `evento` + `ano`
* hardening transacional de designações para salvar snapshots a partir do sábado relido dentro da transação
* otimização do carregamento de PDF de temas para baixar o parser apenas quando houver importação
* reenfileiramento de Google Calendar em mudança de configuração restrito a eventos especiais ativos e eventos já publicados
* saneamento do catálogo oficial de temas com categorização por assunto e importação assistida do PDF oficial `S-99a_T`
* saneamento completo de PT-BR com correção de acentuação, consistência editorial e mensagens mais claras
* redução de linguagem técnica nas telas operacionais, preservando detalhes internos apenas onde houver valor administrativo real
* reorganização do desktop para aproximar a experiência do mockup de referência, sem regredir a navegação mobile já entregue
* simplificação dos status de oradores para `ativo`, `indisponível` e `inativo`, consolidando férias como indisponibilidade temporária e transferidos como inativos preservados no histórico
* controle explícito de e-mails por revisão da designação, mantendo notificações automáticas desligadas por padrão, um único lembrete automático 4 dias antes e envio manual de confirmação como ação única até a próxima edição
* confirmação por WhatsApp com mensagem completa de data, discurso, origem, destino, endereço, dia e horário da reunião
* validação visual em larguras desktop e mobile antes do aceite final do lançamento

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
* PWA instalável com nome, ícones próprios e suporte ao shell offline

### Autenticação

* Firebase Auth integrado
* Login administrativo somente com Google Popup
* Persistência de sessão
* Logout
* Rotas protegidas
* acesso restrito à custom claim `admin = true`
* allowlist administrativa em `settings/adminAccess`, mediada pelo worker
* reconciliação da claim no primeiro login Google de um e-mail aprovado
* painel de Configurações para adicionar e remover administradores

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
* leitura e escrita inicial de `settings/app` com foco no ano padrão do painel
* páginas de `congregations`, `themes` e `speakers` conectadas ao Firestore em modo leitura

### Firestore — avanço da Fase 3

* `calendarEvents` conectado ao app como base técnica de sábados, exceções e bloqueios por ano
* `assignments` conectado ao app com leitura de histórico recente
* visão operacional cruza `calendarEvents` com `assignments` para indicar onde já existe designação
* páginas de dashboard, designações e histórico deixaram de depender de mocks principais

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
* unicidade de número protegida por reserva transacional em `themeNumbers`
* bloqueio de retirada da base ativa enquanto houver oradores operacionais vinculados

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

### Designações — fechamento da Fase 8

* operação real de `assignments` implementada na UI
* cadastro de entrada de visitantes, saída de locais e designação local sem coleção paralela
* confirmação manual com atualização de `confirmedAt` e `responseAt`
* troca operacional com substituição automática da designação anterior e preservação do histórico
* edição de status, observações, congregação de destino, orador e tema com auditoria
* bloqueios de RN001, RN002, RN003 e RN006 aplicados na camada de serviço
* alerta de uso recente de tema na própria tela para apoiar a RN007
* cancelamento via mudança de status, sem exclusão de documentos em `assignments`
* criação e edição passam a usar o sábado relido dentro da transação para evitar snapshot operacional desatualizado

### Dashboard — fechamento da Fase 9

* dashboard principal conectado a leituras reais de `calendarEvents`, `assignments`, `congregations` e `settings/app`
* janela operacional com os próximos 8 sábados, sem depender dos mocks iniciais
* métricas de pendências, sem designação, aguardando resposta e próximos eventos especiais
* destaque do próximo sábado com status, tipo de evento, orador, congregação e tema quando houver cobertura
* painel de pendências priorizando lacunas de designação e confirmações ainda em aberto
* listagem dos próximos eventos especiais, congressos, assembleias e visitas futuras
* refatoração V1 removeu a aba Agenda da navegação e adicionou ação direta nos cards de sábado sem designação para abrir Designações com a data pré-selecionada
* handoff Dashboard → Designações passa a carregar corretamente sábados de outro ano em janelas de virada

### Histórico — fechamento da Fase 10

* tela de histórico conectada a `assignments` com consulta real por período
* filtros administrativos por tema, orador e congregação sem coleção paralela
* linha do tempo agrupada por mês para leitura rápida em desktop e mobile
* atalho para ano atual e carregamento progressivo do histórico permanente
* resumo operacional dos registros carregados, confirmados, pendentes e congregações envolvidas

### EmailJS — fechamento da Fase 11

* fila automática de `notifications` restrita ao lembrete de 4 dias; confirmações usam ação imediata
* criação de designação passa a deixar notificações automáticas por e-mail desligadas por padrão, com ativação explícita no cadastro
* envio manual de e-mail de confirmação é processado imediatamente pelo worker, uma única vez por revisão da designação; uma edição libera novo envio com os dados atualizados
* falhas definitivas no envio manual não consomem a ação única; o painel permite tentar novamente até ocorrer envio ou existir uma solicitação pendente
* ações de e-mail ficam bloqueadas no painel quando as chaves públicas do EmailJS não estão configuradas no frontend
* botão de confirmação por WhatsApp disponível quando o orador possui WhatsApp, reutilizando a mesma mensagem completa no dashboard e na lista de designações
* lembrete único de 4 dias programado por utilitário tipado e coberto por teste dedicado
* confirmação pública por link em rota do frontend, com fluxo validado para desktop e mobile
* worker Cloudflare com cron exclusivo para `reminder4d` e endpoints administrativos imediatos para os botões de e-mail e agenda
* confirmação pública grava `confirmedAt`, `responseAt` e auditoria no Firestore após validação do token
* confirmação pública protegida com precondition do Firestore para não reativar designação já substituída em paralelo
* autenticação do worker no Firestore via service account do Firebase, sem depender de usuário técnico
* template único do EmailJS reaproveitado para confirmação e lembretes com parâmetros padronizados
* sincronização da fila preservando estado já processado quando a identidade de entrega não muda, e reabrindo o ciclo apenas quando a entrega realmente muda
* edição de designação operacional com automação ativa reabre explicitamente a confirmação, usando `ATUALIZAÇÃO` no assunto sem depender da variação de `scheduledFor`
* lembrete de 4 dias é cancelado quando a automação for ativada depois do horário oficial, sem disparo tardio com texto incorreto
* botão de envio manual solicita processamento imediato em endpoint administrativo autenticado do worker, mantendo o cron como contingência
* dashboard e Designações acompanham mudanças da fila em tempo real para refletir envio, falha e bloqueio sem recarregar a página
* scripts `test:notifications`, `typecheck:worker`, `deploy:worker` e `worker:deploy` adicionados para a operação da fase

### Google Calendar — fechamento da Fase 12

* `settings/calendar` passa a ser documento real do Firestore para ativação da integração, `calendarId`, horário padrão e duração padrão
* `calendarEvents` passa a armazenar o vínculo remoto com Google Calendar e o estado oficial de sincronização
* mudanças em `calendarEvents` continuam podendo marcar pendências técnicas, enquanto `assignments` operacionais passam a depender de solicitação manual pelo botão `Sincronizar com agenda`
* a última aprovação manual passa a ficar registrada em `calendarEvents.googleCalendarManualSyncRequestedAt`, para que publicação, atualização ou remoção operacional não aconteçam sem novo clique
* `settings/calendar.configurationUpdatedAt` passa a distinguir alteração real de configuração dos ciclos internos do worker
* o worker Cloudflare inicia a sincronização segura com Google Calendar usando a mesma service account já adotada na Fase 11
* a tela de configurações passa a exibir a configuração e o último estado global de sincronização da Fase 12
* o Google Calendar deixa de espelhar slots vazios e passa a publicar, mediante ação manual, qualquer designação operacional (`orador visitante`, `designação local` ou `discurso fora`), além de `evento especial`
* quando o cadastro em `speakers` tiver `email`, o orador envolvido entra como convidado nas designações publicadas, com convites, updates e cancelamentos enviados pelo Google Calendar
* mudanças de configuração do Google Calendar reenfileiram eventos especiais ativos e eventos já publicados sem varrer todos os sábados materializados

Impacto técnico desta abertura de fase:

* não foi criada coleção nova para fila paralela de calendário
* o vínculo remoto fica no próprio `calendarEvents`, reduzindo leituras e evitando mapeamentos duplicados
* `settings/calendar` concentra a configuração operacional e o status global da integração

Fechamento técnico obrigatório da Fase 12:

* painel e regras do Firestore restritos à custom claim `admin = true`
* fila leve de `calendarEvents` processada com `claim` temporário para evitar concorrência entre cron e trigger interno
* retentativas persistidas com novo horário em `googleCalendarSyncScheduledFor`, sem perder falhas transitórias
* ID remoto determinístico no Google Calendar para que uma retomada não crie duplicidade
* `calendarEvents.updatedAt` preservado para alterações administrativas reais, sem sobrescrever o campo durante ciclos internos do worker

Fechamento de acesso administrativo da V1:

* login simplificado para Google Popup, sem formulário de e-mail e senha no frontend
* allowlist administrativa centralizada em `settings/adminAccess`, sem coleção paralela
* endpoints do worker autenticados por ID token Firebase para listar, aprovar e revogar administradores
* reconciliação da custom claim `admin = true` após login Google de e-mail previamente aprovado
* bloqueio de remoção do próprio administrador e do último acesso ativo
* regras do Firestore exigem claim e allowlist simultaneamente para revogar acesso imediatamente mesmo com token antigo

Regra de manutenção desta documentação:

* sempre atualizar esta seção quando uma fase for concluída
* sempre deixar explícitas a fase atual e a próxima fase obrigatória
* durante o fechamento da V1, manter explícita a frente ativa de qualidade visual e textual até o checklist final ser concluído

---

# Objetivo

Desenvolver um sistema web para gerenciamento de:

* Discursos públicos
* Oradores locais
* Oradores visitantes
* Congregações
* Sábados de reunião com designação de orador e tema
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
* PWA instalável com identidade visual própria

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

* `settings/app` com leitura e salvamento real do ano padrão do painel
* `congregations`, `themes` e `speakers` em leitura real
* validação de documentos via tipagem estrita no frontend
* `calendarEvents` em leitura real por ano
* `assignments` em leitura real para sábados de discurso e histórico
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
* mapsUrl
* meetingDay
* meetingTime
* publicTalkCoordinatorName
* publicTalkCoordinatorPhone
* publicTalkCoordinatorEmail
* observações
* isLocal

Critérios:

* Cadastro fixo da congregação local
* Cadastro separado de congregações externas
* Edição
* Exclusão
* Busca
* Paginação

Entregas realizadas:

* formulário completo com validação estrita
* área fixa para a única congregação local ativa, com contato do coordenador de discursos
* formulário de externas/parceiras salvando `isLocal = false` automaticamente, sem seletor manual de tipo
* listagem com busca local e paginação
* edição em tela
* exclusão lógica com remoção da base ativa apenas para congregações externas
* proteção contra exclusão ou conversão da congregação local fixa
* bloqueio de exclusão quando houver oradores vinculados
* cadastro opcional do irmão responsável pelo arranjo de discursos com nome, WhatsApp e e-mail separados
* geração de auditoria para create, update e delete
* remoção do campo `CEP` da UI e do schema oficial por não ter utilidade operacional nesta V1

---

## FASE 5 — Temas

Status atual:

* Concluída

Implementar CRUD.

Campos:

* número
* título
* categoria
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
* categorização oficial por assunto no próprio cadastro de temas
* busca local rápida por número, título, categoria e observações
* auditoria para create, update e delete
* reserva transacional de número para evitar duplicidade concorrente
* bloqueio de inativação ou exclusão quando houver oradores ativos vinculados
* importação administrativa do PDF oficial `S-99a_T` com preview, categorização automática e atualização por número

Impacto técnico desta extensão:

* `themes` passa a exigir o campo `category` como enum oficial do catálogo
* a importação por PDF reutiliza `themeNumbers` e faz create/update por número, sem coleção paralela
* notas existentes permanecem preservadas durante importações quando o PDF não traz observações equivalentes
* bases legadas sem `category` devem ser regularizadas pela importação do PDF oficial antes do uso pleno dos novos filtros por categoria

---

## FASE 6 — Oradores

Status atual:

* Concluída

Implementar CRUD.

Campos:

* nome
* email
* WhatsApp
* congregationId
* type
* themeIds[]
* status
* unavailableStart
* unavailableEnd
* notes

Status:

* ativo
* indisponível
* inativo

Critérios:

* múltiplos temas
* filtro por congregação
* filtro por status

Entregas realizadas:

* formulário completo com validação estrita
* vinculação de múltiplos temas por orador
* controle administrativo simplificado de status ativo, indisponível e inativo
* período de indisponibilidade com datas inicial e final para bloqueios temporários
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
* `calendarEvents` mantido como estrutura técnica para sábados, exceções, bloqueios e sincronização externa
* suporte aos tipos `publicTalk`, `congress`, `assembly`, `visit` e `special`
* bloqueio automático de designações em congressos e assembleias
* renderização implícita dos sábados regulares, mesmo sem documento salvo
* `calendarEvents` passa a representar exceções, bloqueios e personalizações do dia, além dos slots materializados sob demanda
* a antiga tela de Agenda deixou de ser parte da navegação operacional; exceções futuras devem ser tratadas sem reintroduzir cadastro genérico no fluxo principal
* auditoria para create, update e delete

---

## FASE 8 — Designações

Status atual:

* Concluída

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

Entregas realizadas:

* CRUD operacional real de `assignments` na UI, sem apagar histórico
* suporte a entrada de visitantes, saída de locais e designação local com snapshots oficiais
* confirmação manual com atualização de timestamps de resposta e confirmação
* substituição automática da cobertura operacional anterior ao cadastrar nova designação no mesmo evento
* edição de status e observações com preservação da trilha em `auditLogs`
* alerta de uso recente de tema direto no fluxo de designação
* bloqueios oficiais para tema fora do orador, evento bloqueado e indisponibilidade do orador

---

## FASE 9 — Dashboard

Status atual:

* Concluída

Implementar:

* próximos 8 sábados
* pendências
* sem designação
* aguardando resposta
* próximos eventos especiais

Entregas realizadas:

* dashboard operacional com leituras reais do Firestore
* próximos 8 sábados calculados a partir dos slots ativos de discurso público
* contagem de pendências, sem designação e aguardando resposta na janela imediata
* destaque do próximo sábado com cobertura atual ou alerta de lacuna
* listagem dos próximos eventos especiais com contexto operacional
* cards de sábado sem designação apontam diretamente para nova designação com a data pré-selecionada

---

## FASE 10 — Histórico

Status atual:

* Concluída

Implementar filtros:

* tema
* orador
* congregação
* período

Implementar:

* linha do tempo
* histórico permanente

Entregas realizadas:

* consulta real de `assignments` por período, com carregamento progressivo do histórico permanente
* filtros por tema, orador e congregação aplicados sobre a resposta oficial do Firestore
* linha do tempo agrupada por mês com status, tipo de movimentação e notas preservadas
* resumo visual dos registros carregados, confirmados, pendentes e congregações envolvidas

---

## FASE 11 — EmailJS

Status atual:

* Concluída

Implementar:

* envio automático
* lembrete 4 dias antes da reunião
* confirmação via link

Utilizar:

* Cloudflare Workers
* Cloudflare Cron

Entregas realizadas:

* sincronização automática da fila `notifications` a partir das mudanças em `assignments`
* lembrete automático único de 4 dias com agendamento oficial; confirmação somente por ação imediata do botão
* confirmação pública por link com validação no worker e escrita segura no Firestore
* endpoint administrativo imediato para confirmação manual e cron exclusivo para `reminder4d`
* segredos mantidos fora do frontend, via variáveis do worker e service account do Firebase
* template único do EmailJS alimentado por `email_subject`, `to_email`, `reply_to`, `notification_type_label`, `organization_name`, `speaker_name`, `event_date`, `event_type_label`, `local_congregation_name`, `origin_congregation_name`, `theme_number`, `theme_title`, `status_label`, `notes` e `confirmation_url`

Fluxo operacional oficial da Fase 11:

* `pending`: gera `reminder4d` quando a designação continua operacional, o evento ainda não passou, existe e-mail válido e o lembrete automático foi ativado
* somente `reminder4d` entra automaticamente como `pending` quando `assignments.emailNotificationsEnabled = true`; confirmações automáticas permanecem canceladas
* o disparo manual de confirmação usa notificação `manual` com agendamento imediato e grava `manualConfirmationEmailRequestedAt`; na mesma revisão, nova solicitação só é permitida após falha definitiva, nunca enquanto estiver pendente ou depois de enviada
* toda edição operacional inicia uma nova revisão para o controle de e-mail: solicitações anteriores permanecem no histórico, mas deixam de bloquear um novo envio manual
* o botão de e-mail executa a tentativa imediatamente e só fica bloqueado após envio bem-sucedido na revisão atual
* `confirmed`: mantém lembretes futuros ativos
* `declined`, `cancelled` e `replaced`: encerram as automações pendentes da designação, preservando o histórico
* sincronizações de status sem edição preservam notificações já processadas, sem usar `scheduledFor` como identidade de entrega
* edição operacional libera novo envio manual de confirmação com os dados atuais
* lembrete de 4 dias não é enviado quando seu horário oficial já passou
* o worker faz `claim` temporário da notificação antes de enviar para reduzir duplicidade em concorrência
* retentativas usam novo `scheduledFor`; após o limite, a notificação passa para `failed`
* falhas permanentes de configuração do EmailJS são registradas em `notifications.errorMessage` e exibidas nas telas operacionais

IMPORTANTE:

Não expor chaves sensíveis no frontend.

---

## FASE 12 — Google Calendar

Status atual:

* Concluída

Entregue:

* publicação, atualização e remoção imediatas pelo botão `Sincronizar Agenda`
* sincronização segura por endpoint administrativo autenticado, sem depender do cron

Entregas desta fase:

* `settings/calendar` com persistência real para `enabled`, `calendarId`, horário padrão e duração padrão
* estado de sincronização do Google Calendar registrado diretamente em `calendarEvents`
* publicação manual de qualquer designação operacional — `orador visitante`, `designação local` ou `discurso fora` — concluída imediatamente pelo botão `Sincronizar Agenda`
* aprovação manual persistida no próprio `calendarEvents`, impedindo republicação operacional sem novo pedido
* alinhamento entre UI e worker para usar a designação operacional vigente como referência da ação manual
* worker preparado para criar, atualizar e excluir eventos no Google Calendar por cron e trigger interno
* calendário remoto restrito a eventos operacionais reais, aceitando designações pendentes ou confirmadas e sem publicar sábados vazios
* edições exigem nova solicitação manual; cancelamentos e substituições exigem nova solicitação para atualizar ou remover o evento remoto

Fechamento técnico entregue:

* autorização administrativa por custom claim `admin = true`
* login administrativo somente com Google Popup
* allowlist administrativa em `settings/adminAccess`, mediada por endpoints autenticados do worker
* painel de Configurações para adicionar e remover administradores
* `claim` temporário por item da fila leve para impedir corrida entre cron e trigger interno
* retentativa persistida com agendamento futuro após falha transitória
* ID remoto determinístico para manter idempotência mesmo quando o Firestore falha após a chamada ao Google Calendar
* separação entre alteração administrativa (`updatedAt`) e atualização técnica de sincronização (`googleCalendarSyncUpdatedAt`)

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
* `Cloudflare Workers` e `Cloudflare Cron Triggers` operam a automação de e-mails da Fase 11 e seguem disponíveis para novas rotinas agendadas
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
