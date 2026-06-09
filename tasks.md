# Plano de Implementacao

Este plano segue o [backend-guideline.md](./backend-guideline.md) e assume TDD como abordagem padrao.

## Premissas

- O projeto sera iniciado e executado via Docker.
- A pasta de entrada e validacao sera `src/data`, nao `src/dtos`.
- O CRUD basico sera entregue antes da integracao com IA externa.
- A entidade `ticket` ja nasce com classificacao, mas a primeira versao usa uma implementacao local deterministica.
- Cada etapa deve começar pelos testes mais relevantes e so depois pela implementacao.

## Etapa 0 - Ambiente e estrutura base

Objetivo: deixar o projeto pronto para desenvolvimento, execucao e testes dentro de containers.

- [ ] Subir a base do projeto com Docker e Docker Compose.
- [ ] Configurar container da aplicacao Node.js e container do PostgreSQL.
- [ ] Definir arquivos base do ambiente: `Dockerfile`, `docker-compose.yml`, `.env.example`, `package.json`, `tsconfig.json`.
- [ ] Inicializar Prisma, Jest e scripts principais de desenvolvimento.
- [ ] Montar a estrutura de pastas do projeto conforme o guideline, usando `src/data`.
- [ ] Criar o esqueleto da aplicacao com `app.ts`, `server.ts`, `prisma.ts`, `logger.ts`, `AppError`, middleware de erro, middleware de validacao e rota `GET /health`.

## Etapa 1 - Entidade User

Objetivo: entregar o CRUD completo de usuarios com TDD, seguindo controller fino, service com regra e validacao por Zod.

- [ ] Escrever os testes unitarios principais do `UserService`.
- [ ] Modelar `User` no Prisma e gerar a migration.
- [ ] Implementar a camada `data` de `user`, o `UserService`, o `UserController` e as rotas `POST /users`, `GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`.
- [ ] Escrever e fazer passar os testes de integracao HTTP do CRUD de usuarios.

## Etapa 2 - Entidade Ticket sem IA externa

Objetivo: entregar a criacao e consulta de tickets sem acoplar o dominio a um provedor externo.

- [ ] Escrever os testes unitarios do fluxo principal de tickets e da interface de classificacao.
- [ ] Modelar `Ticket` no Prisma, com relacao a `User`, status, channel, priority e manual review, mantendo naming do schema em Ingles.
- [ ] Criar a interface `ITicketClassifier` e uma implementacao local baseada em regras.
- [ ] Implementar a camada `data` de `ticket`, o `TicketService`, o `TicketController` e as rotas `POST /tickets`, `GET /tickets`, `GET /tickets/:id` e `PUT /tickets/:id/status`.
- [ ] Escrever e fazer passar os testes de integracao HTTP de tickets.

## Etapa 3 - Fechamento da entrega basica

Objetivo: fechar a entrega do desafio com consistencia de operacao, testes e documentacao.

- [ ] Revisar contratos HTTP, tratamento global de erros e logging estruturado.
- [ ] Garantir que migrations, Prisma Client e ambiente Docker estejam consistentes.
- [ ] Atualizar `README.md` com setup, execucao, testes e exemplos de requisicao.
- [ ] Rodar e estabilizar a suite de testes unitarios e de integracao.

## Etapa 4 - IA externa

Objetivo: substituir a classificacao local por uma integracao real sem retrabalho arquitetural.

- [ ] Implementar um classifier baseado em Gemini por tras de `ITicketClassifier`.
- [ ] Adicionar fallback, logs estruturados e testes unitarios da integracao.
- [ ] Decidir se a classificacao final ficara sincrona ou ira para fila em etapa posterior.

## Ordem de execucao

1. Etapa 0 - Ambiente e estrutura base.
2. Etapa 1 - Entidade User.
3. Etapa 2 - Entidade Ticket sem IA externa.
4. Etapa 3 - Fechamento da entrega basica.
5. Etapa 4 - IA externa.
