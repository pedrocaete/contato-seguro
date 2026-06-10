# contato-seguro

API de triagem de tickets com foco em padronização de backend, validação, logging e integração com IA.

## Visão Geral

Este repositório concentra as diretrizes arquiteturais e operacionais do projeto. O objetivo é manter a API previsível, testável e consistente mesmo sob crescimento de carga.

O ambiente de desenvolvimento foi preparado para rodar via Docker, com aplicação Node.js e PostgreSQL em containers separados.
A classificação de tickets agora roda de forma assíncrona com Redis, BullMQ e um worker dedicado.

## Configuração de ambiente

Crie um `.env` com base no `.env.example` antes de subir os containers.

Exemplo:

```bash
cp .env.example .env
```

Variáveis principais:

- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: credenciais do PostgreSQL usadas no ambiente Docker.
- `DATABASE_URL`: conexão com PostgreSQL usada pelo Prisma.
- `TICKET_CLASSIFIER_PROVIDER`: `rule_based` ou `gemini`.
- `GEMINI_MODEL`: modelo usado quando o provider for `gemini`.
- `GEMINI_API_KEY`: obrigatória quando `TICKET_CLASSIFIER_PROVIDER=gemini`.
- `GEMINI_TIMEOUT_MS`: timeout por tentativa da chamada ao Gemini.
- `GEMINI_MAX_RETRIES`: número de novas tentativas antes de cair no fallback local.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: conexão usada pela fila BullMQ.
- `QUEUE_TICKET_CLASSIFICATION_NAME`: nome lógico da fila de classificação de tickets.

## Tecnologias

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Jest
- Docker e Docker Compose

## Como usar com Docker

1. Build e subida do ambiente completo:

```bash
docker compose build app
docker compose up -d
```

2. Rode as migrations já versionadas dentro do container da aplicação:

```bash
docker exec -it test_contato_seguro npm run prisma:deploy
```

3. Acesse o container com shell interativo quando precisar:

```bash
docker exec -it test_contato_seguro bash
```

4. Rode testes e build pelo container já em execução:

```bash
docker exec -it test_contato_seguro npm test
docker exec -it test_contato_seguro npm run build
```

5. A API inicial sobe com o endpoint:

```bash
GET /health
```

Portas padrão:

- App: `http://localhost:3333`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Containers padrão:

- App: `test_contato_seguro`
- Banco: `test_contato_seguro_db`
- Worker: `test_contato_seguro_worker`
- Redis: `test_contato_seguro_redis`

## Fila

O fluxo assíncrono de tickets funciona assim:

1. `POST /tickets` cria o ticket com `status: EM_ANALISE`.
2. O backend enfileira um job de classificação no Redis via BullMQ.
3. O worker consome o job, chama o classificador configurado e atualiza o ticket no banco.
4. O ticket vai para `ABERTO` quando a classificação é conclusiva.
5. O ticket permanece em `EM_ANALISE` quando a classificação exigir revisão manual.
6. Se a fila esgotar todas as tentativas do job, o ticket cai para revisão manual como fallback operacional.

Componentes usados:

- Redis no Docker Compose
- BullMQ como biblioteca de fila
- worker dedicado para classificação de tickets

## Como testar

Rode a suíte automatizada dentro do container da aplicação:

```bash
docker exec -it test_contato_seguro npm test
```

Valide o build TypeScript:

```bash
docker exec -it test_contato_seguro npm run build
```

Para testes manuais da API, use o arquivo [`requests.http`](./requests.http).

## Endpoints

- `GET /health`
- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`
- `POST /tickets`
- `GET /tickets`
- `GET /tickets/:id`
- `PUT /tickets/:id/status`

## Regras de classificação

- `OUVIDORIA`: denúncias, assédio, fraude ou temas de conduta.
- `SAC`: problemas com produto, entrega, assinatura ou atendimento.
- `SUPORTE_TECNICO`: erro de acesso, bug, falha de sistema ou instabilidade.
- `FINANCEIRO`: cobrança, pagamento, fatura ou reembolso.
- `FORA_DO_ESCOPO`: mensagens vagas, sem contexto suficiente ou fora do cenário.

Prioridade inicial:

- `ALTA`: casos sensíveis como denúncia, assédio e fraude.
- `MEDIA`: problemas de uso do serviço, acesso ou cobrança.
- `BAIXA`: casos genéricos ou fora do escopo.

Casos ambíguos ou sem contexto suficiente são marcados com `manualReview: true`.

Cada ticket persistido tambem registra:

- `classificationConfidence`: confianca da classificacao entre `0` e `1`
- `classificationAlternatives`: canais alternativos sugeridos pela classificacao

O backend tambem promove `manualReview` automaticamente quando:

- `classificationConfidence < 0.75`
- houver pelo menos um item em `classificationAlternatives`
- o classificador ja sinalizar ambiguidade explicitamente

## Exemplos de requisição

As chamadas abaixo também estão organizadas em [`requests.http`](./requests.http).

Health check:

```bash
curl http://localhost:3333/health
```

Criar usuário:

```bash
curl -X POST http://localhost:3333/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

Listar usuários:

```bash
curl http://localhost:3333/users
```

Criar ticket:

```bash
curl -X POST http://localhost:3333/tickets \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"requestText":"Meu produto nao chegou e quero cancelar a assinatura."}'
```

Exemplo de resposta:

```json
{
  "id": 1,
  "userId": 1,
  "requestText": "Meu produto nao chegou e quero cancelar a assinatura.",
  "channel": null,
  "status": "EM_ANALISE",
  "priority": null,
  "manualReview": false,
  "classificationConfidence": null,
  "classificationAlternatives": [],
  "createdAt": "2026-06-10T00:00:00.000Z",
  "updatedAt": "2026-06-10T00:00:00.000Z"
}
```

Depois que o worker processar a fila, o mesmo ticket passa a refletir a classificação concluída.

Exemplo de resposta após o processamento assíncrono:

```json
{
  "id": 1,
  "userId": 1,
  "requestText": "Meu produto nao chegou e quero cancelar a assinatura.",
  "channel": "SAC",
  "status": "ABERTO",
  "priority": "MEDIA",
  "manualReview": false,
  "classificationConfidence": 0.9,
  "classificationAlternatives": [],
  "createdAt": "2026-06-10T00:00:00.000Z",
  "updatedAt": "2026-06-10T00:00:03.000Z"
}
```

Listar tickets:

```bash
curl http://localhost:3333/tickets
```

Listar tickets com filtros:

```bash
curl "http://localhost:3333/tickets?userId=1&status=ABERTO&channel=SAC"
```

Buscar ticket por id:

```bash
curl http://localhost:3333/tickets/1
```

Exemplo de resposta com revisão manual:

```json
{
  "id": 2,
  "userId": 1,
  "requestText": "Tenho erro e cobranca indevida.",
  "channel": "SUPORTE_TECNICO",
  "status": "EM_ANALISE",
  "priority": "MEDIA",
  "manualReview": true,
  "classificationConfidence": 0.55,
  "classificationAlternatives": ["FINANCEIRO"],
  "createdAt": "2026-06-10T00:05:00.000Z",
  "updatedAt": "2026-06-10T00:05:00.000Z"
}
```

Atualizar status do ticket:

```bash
curl -X PUT http://localhost:3333/tickets/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"EM_ANALISE"}'
```

## Documentação Técnica

- [backend-guideline.md](./backend-guideline.md): guia único com arquitetura, logging, pacotes, testes e integração com Gemini.
- [teste-tecnico.md](./teste-tecnico.md): enunciado do teste técnico.
- `desafio_tecnico_contato_seguro_2 (1) (1).pdf`: material original do desafio.
