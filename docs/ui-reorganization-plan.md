# Plano tecnico de reorganizacao da UI administrativa

## Status

* Estado: em andamento
* Frente: Refatoracao V1 de qualidade visual e operacional
* Escopo: reorganizar layout, cards, filtros, formularios e acoes das telas administrativas
* Banco de dados: sem mudanca de schema Firestore
* Backend/automacoes: sem mudanca de worker, cron ou integracoes externas

## Progresso da refatoracao

* UI-0 iniciada com componentes compartilhados para shell de tela, faixa de metricas, toolbar, card compacto, painel responsivo de formulario e menu de acoes.
* UI-1 aplicada primeiro em Oradores: lista principal antes do formulario, formulario sob demanda, filtros compactos, cards mais densos e acoes secundarias agrupadas.
* Proxima etapa obrigatoria: validar Oradores em desktop e mobile antes de propagar o padrao para Temas.

## Objetivo

Reorganizar a interface administrativa para que a operacao diaria fique mais rapida, compacta e previsivel em desktop e mobile.

A regra principal da refatoracao e inverter a prioridade visual atual:

1. listas e busca devem ser o conteudo principal;
2. formularios de cadastro e edicao devem ser secundarios, acionados sob demanda;
3. cards devem conter as informacoes essenciais sem ocupar altura excessiva;
4. acoes devem ter hierarquia clara, com uma acao principal visivel e acoes secundarias agrupadas;
5. mobile deve ser tratado como fluxo principal, nao como ajuste final.

## Problemas observados

### Formularios ocupam a area nobre

Nas telas de Designacoes, Oradores, Temas e Congregacoes, o formulario aparece antes da lista. Isso faz sentido para um fluxo de primeiro cadastro, mas nao para o uso recorrente do sistema, em que o organizador normalmente precisa localizar, revisar, editar ou confirmar itens existentes.

### Cards muito altos

Os cards atuais exibem muitas informacoes, botoes e alertas em blocos separados. No desktop isso reduz a densidade da lista; no mobile empurra itens importantes para baixo e aumenta a rolagem.

### Acoes competindo entre si

Botoes como Editar, Excluir, Remover da base ativa, Confirmar por WhatsApp e outras acoes aparecem com peso visual parecido. A UI precisa diferenciar acao primaria, acao secundaria e acao destrutiva.

### Filtros sempre expandidos

Filtros sao importantes, mas em telas de consulta longa eles devem consumir menos espaco. No mobile, filtros completos devem abrir em painel, gaveta ou secao colapsavel.

### Identidade visual inconsistente em densidade

O sistema ja tem uma identidade administrativa clara, mas tamanhos, espacamentos, cards, alertas e botoes ainda variam demais entre telas.

## Direcao de produto

O sistema deve parecer uma ferramenta operacional de agenda e cadastros, nao um conjunto de formularios grandes.

O usuario deve conseguir:

* abrir a tela e ver rapidamente a lista principal;
* buscar e filtrar sem perder contexto;
* iniciar um novo cadastro sem esconder definitivamente a lista;
* editar um item sem rolar ate o topo;
* usar a tela no celular com toque confortavel e menos rolagem;
* identificar pendencias, status e dados incompletos sem excesso de alertas grandes.

## Padrao alvo de tela

Cada tela administrativa deve seguir a estrutura abaixo, salvo excecao justificada.

### 1. Cabecalho compacto

Responsabilidade:

* titulo da tela;
* subtitulo curto;
* acao principal quando existir;
* contexto global relevante, como ano base.

No desktop:

* titulo e subtitulo alinhados a esquerda;
* acao principal alinhada a direita;
* evitar duplicar acoes dentro do conteudo quando elas ja estiverem no cabecalho.

No mobile:

* titulo e subtitulo permanecem compactos;
* acao principal pode virar botao no topo ou botao fixo inferior, conforme a tela;
* textos longos devem quebrar em no maximo duas linhas.

### 2. Faixa de metricas

Responsabilidade:

* mostrar contadores uteis para decisao rapida;
* nao ocupar altura de painel.

Padrao:

* usar chips/cards pequenos;
* altura compacta;
* rolagem horizontal no mobile;
* manter icone, rotulo e valor.

### 3. Barra de busca e filtros

Responsabilidade:

* busca textual sempre visivel quando a tela tiver lista;
* filtros secundarios compactos.

Desktop:

* busca e selects em uma linha ou duas linhas compactas;
* filtros avancados podem ficar em botao "Filtros".

Mobile:

* busca visivel;
* filtros em painel colapsavel ou modal inferior;
* resumo dos filtros aplicados em chips removiveis.

### 4. Lista principal

Responsabilidade:

* ser o centro visual da tela;
* exibir itens compactos, navegaveis e consistentes.

Padrao:

* cards com raio ate 8px;
* borda leve;
* sombra minima ou ausente;
* espacamento interno menor que o atual;
* informacao organizada por prioridade.

### 5. Formulario sob demanda

Responsabilidade:

* criar ou editar registros;
* nao ocupar a primeira dobra da tela quando fechado.

Desktop:

* abrir como painel lateral, modal amplo ou secao colapsavel acima da lista;
* manter contexto da lista sempre recuperavel;
* botoes de salvar/cancelar fixos no rodape do painel quando o formulario for longo.

Mobile:

* abrir como tela cheia ou drawer com header claro;
* botao de salvar fixo no rodape;
* secoes avancadas colapsaveis;
* fechar deve voltar para a lista na mesma posicao sempre que possivel.

## Componentes tecnicos propostos

Os componentes devem reaproveitar a base existente em `src/components/app` e `src/components/ui`.

### `EntityPageShell`

Responsabilidade:

* padronizar largura, espacamento vertical e hierarquia de cada tela de cadastro/lista;
* evitar que cada pagina defina seu proprio grid estrutural.

Uso previsto:

* `speakers-page.tsx`
* `themes-page.tsx`
* `congregations-page.tsx`
* `assignments-page.tsx`
* ajustes pontuais em `history-page.tsx` e `settings-page.tsx`

### `MetricStrip`

Responsabilidade:

* substituir faixas de metricas com cards grandes por uma composicao compacta;
* suportar rolagem horizontal no mobile.

Base provavel:

* evoluir ou compor `summary-stat.tsx`, `metric-card.tsx` e `page-header-stat.tsx`.

### `EntityToolbar`

Responsabilidade:

* centralizar busca, filtros principais, chips de filtros ativos e botao de filtros avancados;
* permitir layout desktop em linha e mobile em coluna compacta.

### `CompactEntityCard`

Responsabilidade:

* definir o padrao de card compacto para listas de cadastros;
* aceitar slots para titulo, badges, metadados, alerta curto e acoes.

Regras:

* titulo em destaque;
* badges ao lado do titulo quando houver espaco;
* metadados em linha compacta;
* alerta sempre curto, sem bloco grande quando uma frase resolver;
* uma acao primaria visivel;
* acoes secundarias em menu.

### `ResponsiveFormPanel`

Responsabilidade:

* abrir formularios de criacao/edicao sob demanda;
* usar painel lateral ou modal no desktop;
* usar tela cheia/drawer no mobile;
* preservar footer de acoes.

Pode evoluir a partir de:

* `src/components/ui/modal.tsx`
* estilos compartilhados em `src/index.css`

### `ActionMenu`

Responsabilidade:

* agrupar acoes secundarias e destrutivas;
* reduzir botoes repetidos dentro dos cards;
* manter confirmacoes explicitas para acoes destrutivas.

## Padrao de cards por entidade

### Oradores

Informacao essencial:

* nome;
* tipo: Local ou Visitante;
* status operacional;
* congregacao;
* quantidade de temas;
* contato incompleto quando faltar e-mail ou WhatsApp;
* indisponibilidade quando aplicavel.

Acao primaria:

* Editar.

Acoes secundarias:

* remover da base ativa;
* reativar;
* outras acoes administrativas.

Direcao visual:

* remover botoes grandes empilhados no mobile;
* trocar alertas longos por linha compacta de pendencia;
* manter detalhe completo dentro do formulario/edicao.

### Temas

Informacao essencial:

* numero;
* titulo;
* categoria;
* status ativo/inativo;
* observacao apenas quando existir.

Acao primaria:

* Editar.

Acoes secundarias:

* excluir/inativar;
* restaurar quando aplicavel.

Direcao visual:

* lista mais densa, quase em formato tabela-card;
* numero do tema deve ser facil de escanear;
* titulo deve ser a linha de maior peso.

### Congregacoes

Informacao essencial:

* nome;
* cidade/UF;
* dia e horario;
* endereco resumido;
* indicador Externa ou Local;
* link Maps quando existir.

Acao primaria:

* Editar.

Acoes secundarias:

* excluir/inativar quando permitido.

Direcao visual:

* cards menores;
* evitar coluna de botoes vertical no desktop e no mobile;
* contato do responsavel pode aparecer no detalhe/edicao, nao necessariamente no card compacto.

### Designacoes

Informacao essencial:

* data;
* tipo de movimentacao;
* status;
* orador;
* tema;
* origem/destino;
* estado de comunicacao quando relevante.

Acao primaria:

* Gerenciar ou Editar, conforme o item.

Acoes secundarias:

* WhatsApp;
* enviar e-mail;
* sincronizar agenda;
* cancelar/substituir.

Direcao visual:

* a lista deve aparecer antes do formulario;
* "Nova designacao" deve abrir fluxo sob demanda;
* no mobile, criar uma experiencia em passos curtos: tipo, data, orador, tema e confirmacao.

### Historico

Informacao essencial:

* mes;
* data;
* status;
* tema;
* orador;
* origem/destino.

Direcao visual:

* filtros colapsaveis;
* linha do tempo mais visivel;
* cards historicos compactos, sem acoes principais.

### Dashboard

Informacao essencial:

* proximo discurso;
* proximos sabados sem designacao;
* pendencias reais;
* acesso rapido para designar.

Direcao visual:

* manter a tela como painel operacional;
* compactar cards dos proximos sabados;
* preservar botao direto para Designacoes com data pre-selecionada;
* nao transformar dashboard em tela de cadastro.

## Padroes visuais

### Espacamento

* pagina: espacamento consistente entre blocos;
* cards de lista: padding menor que os cards atuais;
* evitar cards dentro de cards quando a informacao pode ser agrupada por divisores leves;
* no mobile, reduzir margens laterais sem encostar conteudo na borda.

### Botoes

* primario: azul;
* sucesso: verde;
* alerta: ambar;
* destrutivo: vermelho, preferencialmente dentro de menu ou confirmacao;
* secundario: neutro;
* altura desktop: compacta;
* alvo mobile: minimo confortavel para toque.

### Badges

* status operacional deve ser badge;
* metadados nao devem parecer botoes;
* usar cores com parcimonia.

### Alertas

* alerta de bloqueio deve ser forte;
* alerta de pendencia informativa deve ser compacto;
* evitar repetir textos longos em todos os cards.

### Tipografia

* titulos de pagina: fortes, mas sem escala de hero;
* titulos de card: escaneaveis;
* metadados: menores e consistentes;
* descricoes longas devem sair das listas e ir para detalhe/edicao.

## Sequencia de implementacao

### Fase UI-0 — Preparacao

Objetivo:

* criar componentes compartilhados sem mudar comportamento de negocio.

Entregas:

* `EntityPageShell`
* `MetricStrip`
* `EntityToolbar`
* `CompactEntityCard`
* `ResponsiveFormPanel`
* `ActionMenu`

Critérios:

* TypeScript estrito;
* sem `any`;
* sem mudanca de schema;
* sem alterar regras de negocio.

### Fase UI-1 — Oradores

Motivo:

* concentra os principais problemas: formulario grande, lista longa, cards altos, alertas repetitivos e acoes demais.

Entregas:

* lista passa a ser o conteudo principal;
* cadastro/edicao abre sob demanda;
* cards compactos de orador;
* filtros compactos;
* acoes secundarias agrupadas.

Critérios:

* criar, editar, inativar e reativar continuam funcionando;
* selecao de temas continua preservada;
* mobile mostra lista antes do formulario;
* nenhum dado de orador deixa de estar acessivel.

### Fase UI-2 — Temas

Motivo:

* lista grande com necessidade forte de densidade e busca rapida.

Entregas:

* cards compactos por tema;
* formulario sob demanda;
* importacao de PDF preservada no cabecalho ou acao secundaria clara;
* filtros e ordenacao compactos.

Critérios:

* importacao continua acessivel;
* criar, editar, inativar/restaurar continuam funcionando;
* categoria oficial permanece baseada no enum existente.

### Fase UI-3 — Congregacoes

Motivo:

* tela simples para consolidar o padrao de formularios e cards com menos risco.

Entregas:

* lista principal compacta;
* formulario sob demanda;
* cards com endereco, dia/horario e Maps;
* acoes secundarias em menu.

Critérios:

* congregacao local continua protegida;
* externas continuam com exclusao logica;
* contato do responsavel continua editavel.

### Fase UI-4 — Designacoes

Motivo:

* e a tela operacional mais importante e deve receber o padrao depois dos componentes estarem provados.

Entregas:

* lista de designacoes do ano como centro da tela;
* "Nova designacao" sob demanda;
* fluxo mobile em passos curtos;
* comunicacao e status com hierarquia clara;
* preservacao do handoff Dashboard -> Designacoes.

Critérios:

* criar designacao com data pre-selecionada continua funcionando;
* substituicao, cancelamento, confirmacao, WhatsApp, e-mail e agenda continuam disponiveis;
* RN001, RN002, RN003, RN006 e RN007 continuam aplicadas.

### Fase UI-5 — Historico e Dashboard

Motivo:

* ajustes finais de densidade e consistencia sem alterar o foco operacional.

Entregas:

* filtros do Historico colapsaveis;
* timeline mais visivel;
* cards de proximos sabados do Dashboard mais compactos;
* consistencia de badges, metricas e botoes.

Critérios:

* Dashboard continua destacando proximo discurso;
* cards sem designacao continuam abrindo Designacoes;
* Historico continua agrupado por mes e usando filtros locais.

### Fase UI-6 — Configuracoes

Motivo:

* tela menos critica para densidade, mas precisa harmonizar identidade visual.

Entregas:

* cards administrativos mais consistentes;
* filas e atividade recente mais compactas;
* acoes de configuracao preservadas.

Critérios:

* configuracao de ano, admins e Google Calendar continua funcionando;
* fila de notificacoes e atividade recente continuam legiveis.

## Criterios de aceite gerais

Para cada fase de implementacao:

* `npm run lint` deve passar, ou `npm.cmd run lint` no Windows se necessario;
* `npm run build` deve passar, ou `npm.cmd run build` no Windows se necessario;
* nenhuma colecao, campo ou enum novo deve ser criado sem atualizar `FIRESTORE_SCHEMA.md` antes;
* a lista principal deve aparecer antes do formulario no mobile;
* acoes destrutivas devem exigir confirmacao;
* todos os fluxos existentes da tela devem continuar acessiveis;
* a tela deve ser validada em desktop e mobile.

## Validacao visual

Validar pelo menos:

* desktop largo;
* desktop medio;
* mobile estreito;
* tema claro;
* tema escuro quando a tela usar tokens afetados.

Se a validacao por navegador falhar na primeira tentativa, pedir ajuda ao usuario com prints em vez de insistir.

## Fora de escopo

Esta refatoracao nao deve:

* criar nova colecao Firestore;
* alterar contrato de `assignments`, `speakers`, `themes`, `congregations`, `calendarEvents`, `notifications` ou `auditLogs`;
* mudar regras de negocio;
* substituir React Router;
* trocar TailwindCSS ou a base de UI;
* introduzir backend Node;
* alterar EmailJS, Google Calendar ou Workers;
* redesenhar a marca do produto.

## Primeira fatia recomendada

Comecar pela Fase UI-0 e aplicar imediatamente a Fase UI-1 em Oradores.

Essa ordem reduz risco porque:

* prova os componentes compartilhados em uma tela real;
* melhora uma tela de uso frequente;
* resolve os principais problemas de densidade vistos nos prints;
* cria um padrao reutilizavel para Temas, Congregacoes e Designacoes.
