# Sistema de Gestão de Discursos Públicos

Aplicação web para gerenciar discursos públicos de fim de semana, oradores, congregações, temas, histórico e notificações automáticas.

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
* `FASE 11 — EmailJS`
* `FASE 12 — Google Calendar`

Última fase concluída:

* `FASE 12 — Google Calendar`

Etapa atual em andamento:

* refatoração V1 do fluxo direto de designação dos sábados

Próxima etapa obrigatória:

* validar o fluxo Dashboard → Designações em desktop e mobile antes do checklist operacional de lançamento V1

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
* Login administrativo somente com Google Popup
* Persistência de sessão
* Logout
* Rotas protegidas
* acesso restrito à custom claim `admin = true`
* aprovação de e-mails em `settings/adminAccess`, mediada pelo worker
* painel em Configurações para adicionar e remover administradores

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
* `assignments` conectado ao app para sábados de discurso público e histórico recente
* dashboard, designações e histórico passaram a ler a base real

### Fechamento da Fase 3

* `notifications` conectado ao app com leitura real por status
* `auditLogs` conectado ao app com leitura real recente
* tela de configurações consolidada como painel da fundação Firestore

### Fechamento da Fase 4

* CRUD completo de `congregations` na UI
* formulário validado com React Hook Form + Zod
* congregação local tratada como cadastro fixo e único, com contato do coordenador de discursos
* cadastro separado para congregações externas, salvando o tipo automaticamente
* busca local e paginação sobre a base ativa
* exclusão lógica via `isActive` apenas para congregações externas
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
* status simplificado em ativo, indisponível e inativo
* período de indisponibilidade com datas inicial e final para bloqueios temporários
* exclusão lógica com preservação do cadastro para histórico
* auditoria de create, update e delete em `auditLogs`

### Fechamento da Fase 7

* `calendarEvents` mantido como suporte técnico de sábados, exceções, bloqueios e sincronização externa
* renderização implícita dos sábados regulares na visão anual, sem depender de documento salvo
* suporte administrativo aos tipos de evento oficiais
* bloqueio automático de designações para congresso e assembleia
* `calendarEvents` reservado para exceções, bloqueios, personalizações e materializações operacionais do slot
* a antiga tela de Agenda foi removida da navegação operacional para evitar cadastro genérico de eventos no fluxo principal
* materialização sob demanda preserva histórico técnico, concorrência e auditoria quando um sábado implícito precisa virar documento

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
* cards de sábado sem designação abrem Designações com a data pré-selecionada para escolher orador e tema

### Fechamento da Fase 10

* histórico permanente ligado a `assignments` com consulta real por período
* filtros por tema, orador e congregação sem criar coleção paralela
* linha do tempo agrupada por mês, pronta para leitura rápida em desktop e mobile
* atalho para ano atual e carregamento progressivo do histórico
* métricas dos registros carregados, confirmados, pendentes e congregações envolvidas

### Fechamento da Fase 11

* fila automática de `notifications` sincronizada junto com create, update, confirmação e substituição de `assignments`
* notificações automáticas por e-mail ficam desligadas por padrão em cada designação
* envio manual de e-mail de confirmação pode ser solicitado uma única vez por designação operacional
* confirmação por WhatsApp abre mensagem completa com data, discurso, origem, destino, endereço, dia e horário da reunião
* lembrete único de 4 dias com agendamento tipado e cobertura por teste
* confirmação pública por link em rota dedicada do frontend, com boa leitura em desktop e mobile
* worker Cloudflare com cron e trigger manual para processar a fila via EmailJS sem expor segredos no frontend
* confirmação por link validada no worker antes de gravar `confirmedAt`, `responseAt` e auditoria
* confirmação pública protegida com precondition do Firestore para não reativar designação já alterada em paralelo
* autenticação do worker no Firestore via service account do Firebase, sem depender de usuário técnico
* template único do EmailJS reutilizado para confirmação e lembretes, com parâmetros padronizados
* ressincronização da fila preservando notificações já enviadas, falhadas ou canceladas quando a identidade de entrega continua a mesma
* scripts e arquivos base para `deploy:worker`, `worker:deploy`, `typecheck:worker` e segredos locais do worker

### Fechamento da Fase 12

* `settings/calendar` passa a ser documento real do Firestore para ativação da integração, `calendarId`, horário padrão e duração padrão
* `calendarEvents` passa a guardar o vínculo remoto do Google Calendar e o estado oficial de sincronização
* alterações em `calendarEvents` seguem controlando a fila técnica, enquanto designações operacionais passam a usar o botão `Sincronizar com agenda`
* a aprovação manual passa a ficar persistida em `calendarEvents.googleCalendarManualSyncRequestedAt`, evitando republicação operacional sem novo clique
* `settings/calendar.configurationUpdatedAt` passa a separar mudança real de configuração dos ciclos rotineiros do worker
* o worker Cloudflare inicia a sincronização segura com Google Calendar usando a mesma service account da Fase 11
* a tela de configurações passa a exibir a configuração e o último estado global de sincronização
* o Google Calendar passa a publicar apenas `orador visitante`, `discurso fora` e `evento especial`, sem espelhar slots vazios
* quando `speakers.email` existir, `orador visitante` e `discurso fora` passam a incluir o orador como convidado, com convite, atualização e cancelamento enviados pelo Google Calendar
* fila leve protegida com `claim` temporário, retentativa persistida e ID remoto determinístico
* regras do Firestore e frontend restritos à custom claim `admin = true`
* ciclos técnicos do worker deixam de sobrescrever `calendarEvents.updatedAt`
* login administrativo simplificado para Google Popup
* `settings/adminAccess` passa a guardar a allowlist administrativa reconciliada pelo worker
* hardening pós-varredura corrige o handoff Dashboard → Designações na virada de ano, evita snapshot desatualizado em designações transacionais e mantém o parser de PDF fora do carregamento inicial de Temas
* mudanças de configuração do Google Calendar reenfileiram eventos especiais ativos e eventos já publicados sem ler todos os sábados materializados

## Próxima etapa

### Validação visual V1

Status atual:

* obrigatória antes do checklist operacional de lançamento

Executar:

* validar Dashboard → Designações em desktop
* validar Dashboard → Designações em mobile
* confirmar que cards de sábados de outro ano abrem Designações com a data correta

### Checklist de lançamento V1

Status atual:

* próximo passo após a validação visual V1

Executar:

* conceder custom claim `admin = true` às contas administrativas
* publicar regras, índices, frontend e worker atualizados
* validar login administrativo, fila EmailJS, confirmação pública e sincronização Google Calendar em produção

Entregue até o início da Fase 12:

* `settings/app` com persistência real
* CRUD completo de `congregations`
* CRUD completo de `themes`
* CRUD completo de `speakers`
* sábados regulares renderizados implicitamente sem cadastro manual do ano inteiro
* `calendarEvents` preservado como suporte técnico para slots, exceções e Google Calendar
* leitura real de `assignments`, `notifications` e `auditLogs`
* operação real de designações com confirmações, substituições e auditoria
* dashboard operacional com próximos 8 sábados, pendências e eventos especiais
* histórico permanente com filtros por período, tema, orador e congregação
* fila automática de notificações com EmailJS, Cloudflare Worker, cron e confirmação pública por link

Próximo passo obrigatório depois da validação visual:

* executar o checklist operacional de lançamento V1

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
* `npm run typecheck`
* `npm run verify`
* `npm run test:notifications`
* `npm run test:calendar-sync`
* `npm run typecheck:worker`
* `npm run admin:bootstrap -- --email administrador@exemplo.org`
* `npm run admin:grant -- --email administrador@exemplo.org`
* `npm run deploy:worker`
* `npm run deploy:firestore`
* `npm run deploy:hosting`
* `npm run deploy:all`

## Operação da Fase 11

Para ativar a automação de e-mails:

* configure `VITE_PUBLIC_NOTIFICATION_WORKER_URL` no frontend para a URL pública do worker
* configure `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` e `VITE_EMAILJS_PUBLIC_KEY` no frontend; sem essas chaves, os botões e controles de e-mail ficam desabilitados
* configure `EMAILJS_PRIVATE_KEY`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID` e `EMAILJS_TEMPLATE_ID` no ambiente do worker; sem essas credenciais, a notificação vira `failed` e o erro aparece nas telas operacionais
* preencha os segredos locais em [workers/email-automation/.dev.vars.example](/C:/Projetos/discursos/workers/email-automation/.dev.vars.example), usando também a service account do Firebase
* a integração atual usa um único `EMAILJS_TEMPLATE_ID` para confirmação e lembretes
* publique o worker com `npm.cmd run worker:deploy`; o script usa `--keep-vars` para preservar credenciais configuradas fora do repositório

URL pública atual do worker:

* [https://discursos-email-automation.palmascg1.workers.dev](https://discursos-email-automation.palmascg1.workers.dev)

Parâmetros atuais do template único do EmailJS:

* `email_subject`
* `to_email`
* `reply_to`
* `notification_type_label`
* `organization_name`
* `speaker_name`
* `event_date`
* `event_type_label`
* `local_congregation_name`
* `origin_congregation_name`
* `theme_number`
* `theme_title`
* `status_label`
* `notes`
* `confirmation_url`

Fluxo operacional atual da fila:

* `pending`: agenda `confirmation` e `reminder4d` quando a designação cobre o slot, a data ainda não passou, o orador tem e-mail válido e as notificações automáticas estão ativadas na designação
* `manual`: agenda envio imediato pelo botão de e-mail, grava a solicitação na designação e bloqueia novo disparo manual
* quando a confirmação automática já foi enviada ou está na fila, o botão manual fica bloqueado para evitar duplicidade
* `confirmed`: cancela a automação de confirmação e mantém os lembretes futuros ativos
* `declined`, `cancelled` e `replaced`: cancelam as automações da designação, preservando o histórico do documento
* mudanças administrativas que não alteram a identidade de entrega preservam `sentAt`, `retryCount`, `errorMessage` e o status já processado da notificação
* mudanças que alteram a entrega de fato, como destinatário, assunto, orador vinculado ou horário agendado, reabrem a notificação com novo ciclo
* confirmações manuais e confirmações públicas cancelam a notificação `confirmation` correspondente

Fluxo operacional do worker:

* o worker busca notificações `pending` vencidas por `scheduledFor`
* antes do envio, ele faz um `claim` temporário no documento para reduzir duplicidade em execuções concorrentes
* se o EmailJS responder com sucesso, a notificação vira `sent`
* se houver falha transitória, a notificação volta para `pending` com retentativa em 30 minutos
* se atingir o limite de tentativas, a notificação vira `failed`
* se a designação deixar de ser operacional ou a data do evento já tiver passado, a notificação vira `cancelled`

## Operação da Fase 12

Antes de publicar o acesso administrativo:

* defina `GOOGLE_APPLICATION_CREDENTIALS` com o caminho do JSON da service account ou preencha `FIREBASE_SERVICE_ACCOUNT_JSON`
* inicialize a allowlist com `npm.cmd run admin:bootstrap -- --email administrador@exemplo.org`
* publique o worker para permitir a reconciliação da claim no primeiro login Google
* mantenha `npm.cmd run admin:grant -- --email administrador@exemplo.org` apenas como ferramenta operacional para concessão direta a uma conta que já existe no Firebase Auth

Fluxo operacional do Google Calendar:

* `calendarEvents` continua sendo a fila oficial, sem coleção paralela
* designações operacionais entram na fila apenas após o clique em `Sincronizar com agenda`
* eventos especiais entram automaticamente na fila técnica
* o worker faz `claim` temporário antes de processar cada item
* falhas transitórias voltam para `pending` com novo horário; após o limite, ficam em `error`
* o ID remoto determinístico impede duplicidade se o Google Calendar responder antes de uma falha no Firestore
* a integração com Google Calendar permite retomar manualmente eventos não operacionais que terminaram em erro

## Acesso administrativo

* a tela de login oferece apenas `Entrar com Google`
* `settings/adminAccess.adminEmails` guarda a allowlist operacional de administradores
* após o login Google, o frontend pede ao worker a reconciliação da claim `admin = true`
* o painel de Configurações lista e-mails aprovados e permite adicionar ou remover acessos
* adicionar um e-mail antes do primeiro login é permitido; a claim será aplicada quando a pessoa entrar com Google
* remover o próprio acesso ou o último administrador é bloqueado
* o frontend nunca lê ou altera `settings/adminAccess` diretamente
* as regras do Firestore exigem claim e allowlist ao mesmo tempo, revogando o acesso ao banco imediatamente após uma remoção

## Decisão atual de deploy

Para manter a operação mais simples nesta V1:

* o frontend web permanece em `Firebase Hosting`
* `Cloudflare Workers` e `Cloudflare Cron Triggers` operam a automação de e-mails da Fase 11
* `Cloudflare Pages` não faz parte do deploy atual
