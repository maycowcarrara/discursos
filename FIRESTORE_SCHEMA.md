# FIRESTORE_SCHEMA.md

# Sistema de Gestão de Discursos Públicos

## Objetivo

Este arquivo define a estrutura oficial do Cloud Firestore para este projeto.

Ele existe para evitar que o Codex:

* crie coleções diferentes para o mesmo conceito
* invente campos alternativos para dados já existentes
* duplique relacionamentos
* proponha índices inconsistentes
* degrade o banco ao longo do projeto

Se houver conflito entre código, prompts e documentação, este arquivo deve ser tratado como a fonte principal de verdade para o schema do Firestore até que uma alteração formal seja aprovada.

---

## Regras Gerais

### Convenções obrigatórias

* Usar nomes de coleções em `camelCase`
* Usar nomes de campos em `camelCase`
* Todo documento deve ter `createdAt` e `updatedAt`
* Datas de auditoria e sincronização devem usar `Timestamp` do Firestore
* IDs de documentos devem ser estáveis e não depender de texto que pode mudar
* Nunca duplicar entidades por conveniência de tela sem justificativa explícita
* Nunca criar coleção nova sem atualizar este arquivo antes
* Nunca criar campo parecido com outro já existente apenas por preferência de naming

### Autorização administrativa

* o painel administrativo deve exigir usuário autenticado com custom claim `admin = true`
* o login administrativo da V1 deve usar somente Google Popup
* o frontend deve solicitar ao worker a reconciliação da claim após o login Google e encerrar a sessão quando a conta não estiver aprovada
* as regras do Firestore devem aceitar leitura e escrita administrativa apenas quando `request.auth.token.admin == true` e o e-mail autenticado continuar presente em `settings/adminAccess.adminEmails`
* o worker continua autenticando com service account e não depende de usuário técnico do painel
* a allowlist administrativa deve ficar em `settings/adminAccess`, sem coleção paralela de usuários
* `settings/adminAccess` deve ser lido e alterado apenas pelo worker; o frontend usa endpoints administrativos autenticados
* a checagem da allowlist nas regras adiciona uma leitura dependente previsível durante a autorização; o custo é aceito porque a V1 tem baixo volume e acesso restrito ao painel administrativo

### Campos base padrão

Todos os documentos principais devem seguir este padrão mínimo:

```ts
{
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Quando aplicável, também usar:

```ts
{
  createdBy: string // uid do usuário
  updatedBy: string // uid do usuário
  isActive: boolean
}
```

### Relacionamentos

Este projeto deve preferir relacionamento por referência leve, usando `id` e campos desnormalizados mínimos para leitura rápida.

Padrão:

* salvar `xxxId` como chave de relacionamento
* opcionalmente salvar `xxxName` apenas quando isso reduzir leituras em listas
* não salvar objetos completos de outra entidade dentro do documento principal

Exemplo aceitável:

```ts
{
  congregationId: "abc123",
  congregationName: "Congregacao Central"
}
```

Exemplo proibido:

```ts
{
  congregation: {
    id: "abc123",
    name: "Congregacao Central",
    address: "...",
    meetingDay: "sabado"
  }
}
```

---

## Coleções Oficiais

As coleções abaixo são as únicas aprovadas para a V1.

### 1. `settings`

Finalidade:
Configurações globais do sistema.

Estratégia:
Preferir poucos documentos estáveis, com IDs conhecidos.

Documentos previstos:

* `settings/app`
* `settings/notifications`
* `settings/calendar`
* `settings/adminAccess`

Exemplo de `settings/app`:

```ts
{
  organizationName: string
  defaultYear: number
  locale: string
  timezone: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Exemplo de `settings/calendar`:

```ts
{
  enabled: boolean
  calendarId: string
  defaultStartTime: string // formato HH:mm
  defaultDurationMinutes: number
  configurationUpdatedAt?: Timestamp | null
  lastSyncAt?: Timestamp | null
  lastSyncStatus?: "idle" | "running" | "success" | "error"
  lastSyncMessage?: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}
```

Observações:

* `settings/calendar` concentra apenas configuração operacional e status global da integração
* `configurationUpdatedAt` registra apenas a última mudança feita na configuração, sem ser sobrescrito pelos ciclos do worker
* segredos continuam fora do frontend e do Firestore, no worker
* a troca de `calendarId` deve preservar rastreabilidade pelo vínculo remoto salvo em `calendarEvents`

Exemplo de `settings/adminAccess`:

```ts
{
  adminEmails: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}
```

Observações:

* `adminEmails` guarda e-mails normalizados em minúsculas, sem duplicidade
* a presença do e-mail autoriza o worker a reconciliar `admin = true` no Firebase Auth após login Google
* a remoção do e-mail deve revogar a claim existente quando a conta já tiver sido criada no Firebase Auth
* não permitir remover o último administrador nem o próprio administrador autenticado
* o frontend não lê nem escreve este documento diretamente
* as regras do Firestore consultam este documento para revogar imediatamente o acesso ao banco mesmo quando ainda existir token antigo válido

### 2. `congregations`

Finalidade:
Cadastro de congregações locais e externas.

Campos:

```ts
{
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  mapsUrl: string
  meetingDay: string
  meetingTime: string
  notes: string
  isLocal: boolean
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}
```

Observações:

* `name` é o nome oficial exibido na UI
* `isLocal = true` identifica congregação da própria agenda
* não criar campo alternativo como `nome`, `title` ou `congregationName` dentro desta coleção

### 3. `speakers`

Finalidade:
Cadastro de oradores locais e visitantes.

Campos:

```ts
{
  name: string
  email: string
  phone: string
  congregationId: string
  congregationName?: string
  type: "local" | "visitor"
  themeIds: string[]
  status: "active" | "vacation" | "unavailable" | "transferred" | "inactive"
  unavailableStart?: Timestamp | null
  unavailableEnd?: Timestamp | null
  notes: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}
```

Observações:

* usar `themeIds`, nunca `themes` com objetos embutidos
* `type` define a origem do orador
* `status` é obrigatório e controlado por enum

### 4. `themes`

Finalidade:
Cadastro oficial dos temas/discursos.

Campos:

```ts
{
  number: number
  title: string
  isActive: boolean
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}
```

Observações:

* `number` deve ser único no contexto da base
* usar `title`, nunca `name` para tema
* create e update de `themes.number` devem reservar o número em `themeNumbers/{number}` antes de concluir a gravação

### 4A. `themeNumbers`

Finalidade:
Reserva transacional dos números oficiais de tema para impedir duplicidade concorrente.

Campos:

```ts
{
  number: number
  themeId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Observações:

* o ID do documento deve ser o próprio número em formato string
* esta coleção é de suporte interno e não substitui `themes`
* `themeId` aponta para o documento oficial em `themes/{id}`
* não apagar a reserva ao inativar um tema, porque a unicidade continua válida na base

### 5. `calendarEvents`

Finalidade:
Agenda anual com sábados, congressos, assembleias e eventos especiais.

Campos:

```ts
{
  year: number
  date: Timestamp
  type: "publicTalk" | "congress" | "assembly" | "visit" | "special"
  title: string
  description?: string
  congregationId?: string | null
  congregationName?: string | null
  blocksAssignments: boolean
  isActive: boolean
  googleCalendarEventId?: string | null
  googleCalendarCalendarId?: string | null
  googleCalendarSyncStatus?: "pending" | "synced" | "error"
  googleCalendarSyncError?: string | null
  googleCalendarManualSyncRequestedAt?: Timestamp | null
  googleCalendarClaimId?: string | null
  googleCalendarClaimedAt?: Timestamp | null
  googleCalendarRetryCount?: number
  googleCalendarSyncScheduledFor?: Timestamp | null
  googleCalendarSyncUpdatedAt?: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}
```

Observações:

* para congressos e assembleias, `blocksAssignments` deve ser `true`
* sábados comuns também vivem nesta coleção
* o vínculo remoto do Google Calendar deve ficar neste documento, nunca em coleção paralela
* `googleCalendarEventId` identifica o evento remoto atual
* `googleCalendarCalendarId` registra em qual calendário remoto o vínculo foi criado, permitindo migração segura de `calendarId`
* `googleCalendarSyncStatus` controla a fila leve da Fase 12 sem criar nova coleção, inclusive quando a solicitação parte do botão manual `Sincronizar com agenda`
* `googleCalendarManualSyncRequestedAt` registra a última aprovação manual para publicar, atualizar ou remover o item operacional no Google Calendar
* `googleCalendarClaimId` e `googleCalendarClaimedAt` implementam lease temporário para impedir processamento concorrente do mesmo item
* `googleCalendarRetryCount` e `googleCalendarSyncScheduledFor` controlam retentativas sem perder a pendência após falha transitória
* o ID enviado ao Google Calendar deve ser determinístico a partir de `calendarEvents/{id}`, para que uma retomada após falha não duplique o evento remoto
* campos técnicos de sincronização não devem sobrescrever `updatedAt`, que continua representando mudança real feita no calendário administrativo
* slots vazios de `publicTalk` podem existir no Firestore para planejamento anual sem precisarem existir no Google Calendar
* quando houver publicação de `orador visitante` ou `discurso fora`, o worker pode usar `assignments.speakerId` para buscar `speakers.email` e adicionar o orador como convidado no Google Calendar
* não criar coleção paralela como `events`, `schedules` ou `annualCalendar`

### 6. `assignments`

Finalidade:
Registro das designações de discursos.

Campos:

```ts
{
  calendarEventId: string
  eventDate: Timestamp
  eventType: "publicTalk" | "congress" | "assembly" | "visit" | "special"
  localCongregationId: string
  localCongregationName: string
  speakerId: string
  speakerName: string
  speakerType: "local" | "visitor"
  originCongregationId: string
  originCongregationName: string
  themeId: string
  themeNumber: number
  themeTitle: string
  status: "pending" | "confirmed" | "declined" | "cancelled" | "replaced"
  notes: string
  confirmationToken?: string | null
  confirmedAt?: Timestamp | null
  responseAt?: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}
```

Observações:

* esta coleção concentra o histórico operacional da agenda
* salvar snapshots mínimos como `speakerName`, `themeTitle` e `originCongregationName` é permitido para preservar histórico
* nunca depender apenas do documento relacionado para reconstruir histórico antigo
* `confirmationToken` só deve ser resolvido por fluxo público mediado por worker, nunca por escrita pública direta no frontend

### 7. `notifications`

Finalidade:
Fila e histórico de notificações automáticas.

Campos:

```ts
{
  type: "reminder7d" | "reminder1d" | "confirmation" | "manual"
  channel: "email"
  assignmentId?: string | null
  speakerId?: string | null
  recipientEmail: string
  subject: string
  status: "pending" | "sent" | "failed" | "cancelled"
  scheduledFor: Timestamp
  sentAt?: Timestamp | null
  errorMessage?: string | null
  retryCount: number
  provider: "emailjs" | "worker"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Observações:

* Workers e cron devem operar sobre esta coleção
* não expor segredos ou payloads sensíveis no frontend
* a fila ativa pode usar IDs determinísticos por designação e tipo para evitar duplicidade de lembretes dentro da mesma operação

### 8. `auditLogs`

Finalidade:
Auditoria permanente das alterações importantes.

Campos:

```ts
{
  entityType: "congregation" | "speaker" | "theme" | "calendarEvent" | "assignment" | "settings" | "notification"
  entityId: string
  action: "create" | "update" | "delete" | "statusChange" | "sync"
  actorUid: string
  actorName?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  createdAt: Timestamp
}
```

Observações:

* `auditLogs` é append-only
* nunca apagar histórico
* alterações críticas devem registrar `before` e `after` quando possível

---

## Relacionamentos Oficiais

### `speakers` -> `congregations`

* `speakers.congregationId` referencia `congregations/{id}`
* `speakers.congregationName` pode ser salvo como snapshot leve

### `speakers` -> `themes`

* `speakers.themeIds[]` referencia `themes/{id}`
* não usar subcoleção de temas por orador na V1
* novos vínculos só podem usar temas ativos

### `themeNumbers` -> `themes`

* `themeNumbers.themeId` referencia `themes/{id}`
* esta reserva deve ser mantida em transação junto com create/update de `themes.number`

### `assignments` -> `calendarEvents`

* `assignments.calendarEventId` referencia `calendarEvents/{id}`
* `assignments.eventDate` é snapshot para consultas rápidas

### `assignments` -> `speakers`

* `assignments.speakerId` referencia `speakers/{id}`
* `assignments.speakerName` e `assignments.speakerType` são snapshots permitidos

### `assignments` -> `themes`

* `assignments.themeId` referencia `themes/{id}`
* `assignments.themeNumber` e `assignments.themeTitle` são snapshots permitidos

### `assignments` -> `congregations`

* `assignments.localCongregationId` representa a congregação que recebe o discurso
* `assignments.originCongregationId` representa a congregação do orador

### `notifications` -> `assignments`

* `notifications.assignmentId` referencia `assignments/{id}` quando a notificação vier de uma designação

---

## Índices Recomendados

Os índices abaixo devem ser tratados como base inicial da V1.

### `congregations`

* `isActive ASC, name ASC`
* `isLocal ASC, name ASC`

### `speakers`

* `isActive ASC, name ASC`
* `status ASC, name ASC`
* `congregationId ASC, status ASC, name ASC`
* `type ASC, status ASC, name ASC`

### `themes`

* `isActive ASC, number ASC`

### `calendarEvents`

* `isActive ASC, date ASC`
* `year ASC, date ASC`
* `type ASC, date ASC`
* `blocksAssignments ASC, date ASC`
* `googleCalendarSyncStatus ASC, date ASC`
* `googleCalendarSyncStatus ASC, googleCalendarSyncScheduledFor ASC`

### `assignments`

* `eventDate ASC, status ASC`
* `speakerId ASC, eventDate DESC`
* `themeId ASC, eventDate DESC`
* `localCongregationId ASC, eventDate DESC`
* `originCongregationId ASC, eventDate DESC`
* `status ASC, eventDate ASC`
* `calendarEventId ASC`

### `notifications`

* `status ASC, scheduledFor ASC`
* `assignmentId ASC, scheduledFor DESC`
* `speakerId ASC, scheduledFor DESC`

### `auditLogs`

* `entityType ASC, entityId ASC, createdAt DESC`
* `actorUid ASC, createdAt DESC`

---

## Regras de Integridade

### RN001

Uma designação só pode ser criada se `themeId` existir em `speakers.themeIds`.

### RN002

Não criar designação quando `calendarEvents.type = "congress"`.

### RN003

Não criar designação quando `calendarEvents.type = "assembly"`.

### RN004

Toda alteração relevante deve gerar registro em `auditLogs`.

### RN005

Histórico não deve ser apagado. Cancelamento deve mudar status, não remover documento.

### RN006

Se o orador estiver indisponível no período, a UI e a camada de serviço devem bloquear a designação.

### RN007

O sistema deve permitir alerta de uso recente de tema por meio de busca histórica em `assignments`.

---

## Regras para o Codex

Antes de gerar código que envolva Firestore, o Codex deve seguir esta ordem:

1. Ler `AGENTS.md`
2. Ler `IMPLEMENTATION_PLAN.md`
3. Ler `FIRESTORE_SCHEMA.md`

O Codex não deve:

* renomear coleções sem aprovação explícita
* trocar enums por texto livre
* mover relacionamento para subcoleção sem justificativa arquitetural
* introduzir campos duplicados como `nome` e `name` para a mesma finalidade
* criar arrays de objetos quando um array de IDs resolve o caso

Se surgir necessidade de mudança no banco:

1. Atualizar este arquivo
2. Explicar impacto em queries, índices e dados existentes
3. Só depois implementar a mudança

---

## Fora de Escopo na V1

Não criar agora, sem autorização explícita:

* subcoleções por entidade
* multi-tenant
* versionamento de documentos
* anexos binários no Firestore
* relacionamento polimórfico genérico
* estrutura duplicada para mobile e desktop

---

## Resumo Prático

Se houver dúvida sobre onde salvar um dado:

* congregações em `congregations`
* oradores em `speakers`
* temas em `themes`
* agenda anual em `calendarEvents`
* designações em `assignments`
* envios e lembretes em `notifications`
* trilha de auditoria em `auditLogs`
* configurações globais em `settings`

Este arquivo existe para manter o banco coerente do início ao fim do projeto.
