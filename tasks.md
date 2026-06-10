# Plano de Implementacao

Este plano segue o [backend-guideline.md](./backend-guideline.md) e assume TDD como abordagem padrao.

## Premissas

- O projeto sera iniciado e executado via Docker.
- A pasta de entrada e validacao sera `src/data`, nao `src/dtos`.
- O CRUD basico sera entregue antes da integracao com IA externa.
- A entidade `ticket` ja nasce com classificacao, mas a primeira versao usa uma implementacao local deterministica.
- Colunas, tipos e propriedades ficam em Ingles, mas os valores de enum de dominio ficam em Portugues.
- Cada etapa deve começar pelos testes mais relevantes e so depois pela implementacao.

## Etapa 0 - Ambiente e estrutura base

Objetivo: deixar o projeto pronto para desenvolvimento, execucao e testes dentro de containers.

- [x] Subir a base do projeto com Docker e Docker Compose.
- [x] Configurar container da aplicacao Node.js e container do PostgreSQL.
- [x] Definir arquivos base do ambiente: `Dockerfile`, `docker-compose.yml`, `.env.example`, `package.json`, `tsconfig.json`.
- [x] Inicializar Prisma, Jest e scripts principais de desenvolvimento.
- [x] Montar a estrutura de pastas do projeto conforme o guideline, usando `src/data`.
- [x] Criar o esqueleto da aplicacao com `app.ts`, `server.ts`, `prisma.ts`, `logger.ts`, `AppError`, middleware de erro, middleware de validacao e rota `GET /health`.

## Etapa 1 - Entidade User

Objetivo: entregar o CRUD completo de usuarios com TDD, seguindo controller fino, service com regra e validacao por Zod.

- [x] Escrever os testes unitarios principais do `UserService`.
- [x] Modelar `User` no Prisma e gerar a migration.
- [x] Implementar a camada `data` de `user`, o `UserService`, o `UserController` e as rotas `POST /users`, `GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`.
- [x] Escrever e fazer passar os testes de integracao HTTP do CRUD de usuarios.

## Etapa 2 - Entidade Ticket sem IA externa

Objetivo: entregar a criacao e consulta de tickets sem acoplar o dominio a um provedor externo.

- [x] Escrever os testes unitarios do fluxo principal de tickets e da interface de classificacao.
- [x] Modelar `Ticket` no Prisma, com relacao a `User`, status, channel, priority e manual review, mantendo nomes do schema em Ingles e valores de enum em Portugues.
- [x] Criar a interface `ITicketClassifier` e uma implementacao local baseada em regras.
- [x] Implementar a camada `data` de `ticket`, o `TicketService`, o `TicketController` e as rotas `POST /tickets`, `GET /tickets`, `GET /tickets/:id` e `PUT /tickets/:id/status`.
- [x] Escrever e fazer passar os testes de integracao HTTP de tickets.

## Etapa 3 - Fechamento da entrega basica

Objetivo: fechar a entrega do desafio com consistencia de operacao, testes e documentacao.

- [x] Revisar contratos HTTP, tratamento global de erros e logging estruturado.
- [x] Garantir que migrations, Prisma Client e ambiente Docker estejam consistentes.
- [x] Atualizar `README.md` com setup, execucao, testes e exemplos de requisicao.
- [x] Rodar e estabilizar a suite de testes unitarios e de integracao.

## Etapa 4 - IA externa

Objetivo: substituir a classificacao local por uma integracao real sem retrabalho arquitetural.

- [x] Adicionar configuracao de ambiente para IA externa, incluindo `GEMINI_API_KEY`, modelo padrao e uma chave de estrategia para alternar entre classificador local e Gemini sem alterar o `TicketService`.
- [x] Instalar e integrar o SDK `@google/genai` em uma implementacao dedicada de `ITicketClassifier`, mantendo o contrato `ClassificationResult` como unica saida consumida pelo dominio.
- [x] Definir um prompt estruturado e uma validacao de resposta para obrigar o retorno estrito de `channel`, `priority` e `manualReview`, sempre usando os enums de dominio ja adotados no projeto.
- [x] Criar uma composicao de fallback em cadeia: tentativa com Gemini, log estruturado da falha e uso automatico do classificador local por regras quando a IA externa falhar, vier vazia ou responder fora do contrato esperado.
- [x] Escrever os testes unitarios da integracao cobrindo sucesso, resposta invalida, timeout ou erro do SDK e acionamento correto do fallback.
- [x] Manter a classificacao sincrona nesta primeira entrega de IA, documentando que a evolucao para fila e processamento assincrono fica como etapa posterior de escala.

## Etapa 5 - Fila de classificacao assíncrona

Objetivo: migrar o fluxo de criacao e classificacao de tickets para processamento assincrono, preservando o contrato principal da API.

- [x] Adicionar Redis ao `docker-compose.yml` e documentar as variaveis de ambiente da fila.
- [x] Instalar `bullmq` e `ioredis` e criar a infraestrutura base de conexao, fila e worker dedicado.
- [x] Criar o scaffold operacional inicial do worker de classificacao de tickets, com logs estruturados de inicializacao, falha e encerramento.
- [x] Tornar os campos de classificacao do `Ticket` compativeis com estado pendente, permitindo criacao antes da resposta da IA.
- [x] Alterar o `POST /tickets` para criar o ticket em `EM_ANALISE` e enfileirar o job de classificacao.
- [x] Implementar o processamento real do job no worker, com classificacao, atualizacao do ticket e promocao para `ABERTO` ou manutencao em `EM_ANALISE`.
- [x] Definir fallback operacional para job esgotado: ticket segue para revisao manual quando todas as tentativas da fila falharem.
- [x] Cobrir o novo fluxo com testes unitarios e de integracao e manter o build estavel.

## Ordem de execucao

1. Etapa 0 - Ambiente e estrutura base.
2. Etapa 1 - Entidade User.
3. Etapa 2 - Entidade Ticket sem IA externa.
4. Etapa 3 - Fechamento da entrega basica.
5. Etapa 4 - IA externa.
6. Etapa 5 - Fila de classificacao assincrona.
