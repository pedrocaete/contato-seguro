# Diretrizes de Arquitetura e Operação (Backend Unification)

Padrões unificados para estrutura, controllers, services, validações, camada `data`, logging, pacotes e integração com IA da API de Triagem de Tickets. O objetivo é manter o Express coeso, previsível e fácil de testar.

## Estrutura do Projeto

```text
src/
├── controllers/    # Thin — delega a lógica para os Services
├── services/       # Lógica de domínio, orquestração e Prisma
├── data/           # Schemas Zod e tipos inferidos para entrada da aplicação
├── middlewares/    # Interceptadores (Validação, Error Handler, Auth)
├── routes/         # Definição de URIs e mapeamento para Controllers
├── lib/            # Instâncias globais (Prisma, Logger, Gemini)
└── app.ts          # Setup do Express (Middlewares globais, CORS)
```

## Fluxo de Implementação

- TDD como abordagem padrão: começar pelo teste, implementar o mínimo para passar e refatorar em seguida.
- Prioridade de testes: unitários na camada de service e integração na camada HTTP.
- Cada endpoint novo deve nascer com teste antes da implementação final.
- Quando houver integração externa, isole por interface para preservar testes rápidos e determinísticos.

## Nomenclatura e Rotas

- Idioma: rotas, variáveis, classes e métodos em Inglês.
- Exceção: chaves de banco específicas exigidas pelo desafio, como `texto_solicitacao`.
- URIs: padrão REST, plural e kebab-case (ex: `/api/users`, `/api/tickets/:id/status`).
- Injeção (DI Manual): como não há Service Container, instancie o Service dentro do Controller ou passe via construtor na montagem das rotas.

## Controllers — Regras

- Thin Controller: apenas extrai dados (`req.body`, `req.params`), chama o Service e devolve a resposta HTTP (`res.status().json()`).
- Sem `try/catch`: o pacote `express-async-errors` já envia exceções não tratadas para o middleware global.
- Sem regra de negócio: Controllers não acessam o Prisma e não validam regras de domínio.
- Respostas: use HTTP Status Codes corretos (`200 OK`, `201 Created`, `204 No Content`).

```ts
// ✅ Exemplo correto
export class TicketController {
  constructor(private ticketService: TicketService) {}

  async create(req: Request, res: Response) {
    // O req.body já chega aqui validado pelo Middleware do Zod
    const ticket = await this.ticketService.create(req.body);
    res.status(201).json(ticket);
  }
}
```

## Services — Regras

- Single-responsibility: foco na regra de negócio. Um arquivo de Service por domínio (ex: `TicketService`, `UserService`, `IAService`).
- Isolamento HTTP: Services não conhecem `req` ou `res`. Eles recebem tipos primitivos ou tipos da camada `data` e retornam objetos ou disparam erros.
- Acesso a dados: é a única camada autorizada a chamar o `prismaClient`. Substitui o uso de Repositories.
- Erros: se uma regra de negócio falhar, lance um erro (preferencialmente uma classe `AppError` customizada) para interromper o fluxo. O Controller/Express vai capturar isso.

```ts
// ✅ Exemplo correto
export class TicketService {
  constructor(
    private prisma: PrismaClient,
    private iaService: IAService
  ) {}

  async create(data: CreateTicketData) {
    const classificacao = await this.iaService.classify(data.texto_solicitacao);

    return this.prisma.ticket.create({
      data: { ...data, ...classificacao }
    });
  }
}
```

## Data e Validação (Zod) — Regras

- Uma fonte de verdade: use o Zod para validar a entrada HTTP e gerar o tipo TypeScript no mesmo arquivo.
- Organização: concentre schemas e tipos de entrada na pasta `src/data`.
- Nomenclatura: Schemas Zod usam sufixo `Schema` (ex: `CreateTicketSchema`). Os tipos inferidos usam sufixo `Data` (ex: `CreateTicketData`).
- Onde validar: a validação é feita em um middleware genérico nas routes, não dentro do Controller.
- Regras simples: deixe restrições de formato, tamanho e enum no Zod.
- Regras complexas: validações de banco (ex: "ID do usuário não existe") ficam no Service.

```ts
// data/ticket.data.ts
import { z } from 'zod';

export const CreateTicketSchema = z.object({
  userId: z.number().positive(),
  texto_solicitacao: z.string().min(10, 'Detalhe mais a sua solicitação.'),
});

export type CreateTicketData = z.infer<typeof CreateTicketSchema>;
```

## Tratamento de Erros

- O projeto usa um `AppError` para definir erros conhecidos (Client Errors).
- Service: `throw new AppError('Usuário não encontrado', 404);`
- Global Error Middleware: intercepta a falha e devolve `{ error: 'Usuário não encontrado' }` com o status correto. Oculta stack traces em produção.
- Logs: apenas erros 500 (falhas inesperadas/banco caiu) devem gerar um `logger.error()`. Erros 400 (ex: validação) não devem poluir os logs.

## Diretrizes de Logging Estruturado

Guia para uso de logs operacionais e tratamento de erros nesta API Express.js.

O objetivo deste documento não é "logar tudo". O objetivo é reduzir ruído, manter diagnósticos úteis e evitar duplicação de informações entre logs manuais e o middleware de erro global.

### Objetivo e Regras Centrais

- Um log deve existir quando ajuda alguém a operar ou investigar o sistema.
- Uma exception (`throw`) deve existir quando a falha precisa interromper o fluxo e ser propagada.
- Nem toda exception deve virar um log manual (o middleware global já fará isso).
- Não faça log de eventos recorrentes sem valor operacional claro.

### Conceitos no Express + Pino

#### Exception vs Global Error Handler

Use `throw new Error(...)` ou classes customizadas (ex: `AppError`) para sinalizar falhas. O pacote `express-async-errors` vai capturar isso e mandar para o Middleware de Erro Global. Não crie logs manuais para erros que vão "subir".

#### `logger.*` (Pino)

Use `logger.debug`, `logger.info`, `logger.warn`, `logger.error` para registrar um evento operacional intencional. Logs são para operação e diagnóstico, não para substituir fluxo de erro.

#### Audit Log (Auditoria)

Não confunda log técnico com auditoria de negócio. Quando o requisito for histórico persistente de uma ação (ex: "quem mudou o status do ticket"), use registro em banco de dados, e não `logger.info`.

### Árvore de Decisão

Antes de escrever qualquer log, siga esta ordem:

1. A falha deve subir e retornar um erro HTTP (ex: 400, 404, 500)?
   - Sim: lance a exception (`throw`).
   - Não adicione `logger.error(...)` antes do `throw`. Deixe o middleware global logar a falha.
2. A exception foi capturada e o fluxo vai continuar (ex: fallback)?
   - Sim: use `logger.error` ou `logger.warn` para registrar que o fallback foi ativado.
3. Não houve exception, mas aconteceu algo operacionalmente relevante?
   - Sim: use `logger.info(...)` ou `logger.warn(...)`.
4. O evento acontece o tempo todo e é apenas rotineiro (ex: health check)?
   - Sim: não logue em info. (O `pino-http` deve estar configurado para ignorar).

Regra de ouro: uma falha, um sinal principal.

### Níveis (Pino)

- `debug`: diagnóstico detalhado, geralmente desabilitado em produção. (Ex: payload intermediário da IA).
- `info`: evento operacional relevante e esperado. (Ex: "Ticket classificado pela IA"). Não deve ser heartbeat.
- `warn`: anomalia recuperável, resposta externa suspeita. (Ex: "IA fora do ar, usando fallback", "Campo não obrigatório ausente mas útil").
- `error`: falha real capturada que não vai quebrar a requisição.
- `fatal`: indisponibilidade sistêmica extrema que exige derrubar a aplicação (crash).

### Structured Logging (Na Prática)

Logging estruturado significa:

- Mensagem curta e estática.
- Contexto em objeto (JSON).
- Sem interpolar variáveis na string.

Padrão (correto):

```ts
logger.warn({
  ticketId: ticket.id,
  canal: ticket.canal
}, 'Ticket reclassificado manualmente.');
```

Evite (incorreto):

```ts
logger.warn(`Ticket ${ticket.id} foi reclassificado para ${ticket.canal}`);
```

Motivo: dificulta busca por chaves em ferramentas de observabilidade (Datadog, CloudWatch) e piora o agrupamento.

### Contexto Mínimo Recomendado

Mantenha as chaves do objeto consistentes. Chaves recomendadas:

- `ticketId`
- `userId`
- `action` (ex: `classify_ticket`, `create_user`)
- `external_system` (ex: `gemini_api`)

Exemplo de Integração Externa (IA):

```ts
logger.error({
  action: 'ia_classification',
  external_system: 'google_genai',
  ticketId: data.id,
  err: error // O Pino formata objetos Error nativamente
}, 'Falha ao comunicar com a IA');
```

### Dados Proibidos ou Sensíveis

Não registrar em log:

- Senhas brutas.
- Tokens (JWT, API Keys).
- Payload completo de requisições se contiver PII (Dados Pessoais).

Use a configuração de `redact` do Pino ao instanciar o logger para mascarar automaticamente campos como `req.headers.authorization` e `req.body.password`.

### Anti-Patterns

- `logger.error(...)` e depois `throw`
  - Evite. Duplica o log, pois o middleware de erro vai logar o `throw` de novo.
- Mensagem longa com tudo interpolado
  - Use o objeto de contexto sempre como primeiro parâmetro no Pino.
- Logar payload bruto da requisição inteiro via log manual
  - Evite. Gera ruído extremo. Extraia e logue apenas os IDs necessários (ex: `userId`, `ticketId`).

## Guia de Pacotes Node.js (Ecossistema Express)

Este documento mapeia os pacotes essenciais para construir uma API robusta com Express.js e TypeScript, focando em como implementá-los na prática (Padrões vs Exceções).

### `zod`

- **Funcionalidade:** Exerce duplo papel: valida dados em tempo de execução (via Schema) e gera tipagem estrita para o TypeScript (via Inferência).
- **Necessidade:** Substitui o `FormRequest` e o `spatie/laravel-data` do Laravel em uma tacada só.
- **Padronização:** O uso padrão se divide em duas etapas que trabalham juntas.

#### 1. Middleware (A Validação / FormRequest)

Intercepta a rota para validar o `req.body`.

```typescript
// middleware/validate.ts
export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  // Se falhar, lança erro capturado pelo express-async-errors
  req.body = schema.parse(req.body);
  next();
};

// routes.ts
router.post('/tickets', validate(CreateTicketSchema), ticketController.create);
```

#### 2. Data (A Tipagem / Spatie Data)

O Controller repassa os dados validados para o Service usando o tipo inferido.

```typescript
// data/ticket.data.ts
export const CreateTicketSchema = z.object({ texto: z.string().min(10) });
export type CreateTicketData = z.infer<typeof CreateTicketSchema>; // <-- O tipo real da camada de entrada

// services/ticket.service.ts
export class TicketService {
  // O Service exige o tipo da camada data, ignorando o que aconteceu na requisição web
  async create(data: CreateTicketData) {
    // ...
  }
}
```

- **Exceção:** Validações complexas que dependem do banco de dados (ex: "verificar se o email já existe na tabela de usuários") devem ser feitas no Service, não no schema do Zod.

### `express-async-errors`

- **Funcionalidade:** Redireciona erros assíncronos para o manipulador de erros global.
- **Necessidade:** Evita requisições travadas (hanging) quando ocorre um erro no banco.
- **Padronização:** Deve ser a primeira importação no arquivo principal da aplicação. Esqueça blocos `try/catch` nos Controllers.

```typescript
// app.ts
import 'express-async-errors'; // Importação 'crua' no topo
import express from 'express';
// ...
```

### `cors` e `helmet`

- **Funcionalidade:** CORS libera o acesso do frontend; Helmet injeta cabeçalhos de proteção (XSS, Clickjacking).
- **Padronização:** Middlewares globais aplicados antes das rotas.

```typescript
// app.ts
app.use(helmet());
app.use(cors()); // Libera para qualquer origem por padrão
```

- **Exceção (CORS):** Em produção, restrinja o CORS apenas para a URL do seu frontend.

```typescript
app.use(cors({ origin: 'https://meu-frontend.com' }));
```

### `pino` & `pino-http`

- **Funcionalidade:** Logger estruturado em formato JSON. O `pino-http` loga requisições HTTP, e o `pino` puro loga regras de negócio.
- **Necessidade:** Para não lotar o disco/banco de logs em produção com requisições bem-sucedidas (200 OK), é crucial configurar o nível do log (`level`).
- **Padronização:** Dinâmico por ambiente. Em dev, loga tudo (`info`). Em produção, loga apenas erros (`warn` ou `error`). Omitir rotas de health.

```typescript
// app.ts
app.use(pinoHttp({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  autoLogging: {
    ignore: (req) => req.url === '/health' // Exceção: Não poluir o log com ping de monitoramento
  }
}));
```

- **Padronização (pino no Service):** Logar decisões críticas ou falhas de integrações externas.

```typescript
// services/ticket.service.ts
import { logger } from '../lib/logger';

try {
  const canal = await iaService.classificar(texto);
  logger.info({ ticketId: 1, canal }, 'Ticket classificado pela IA');
} catch (err) {
  logger.error({ err }, 'IA fora do ar, usando fallback manual');
}
```

### `supertest` & `jest-mock-extended`

- **Funcionalidade:** `supertest` simula o Express para testes de rota. `jest-mock-extended` simula o `PrismaClient`.
- **Padronização:** Importar o app SEM chamar o `.listen()`.

```typescript
// tests/integration/ticket.test.ts
import request from 'supertest';
import { app } from '../../src/app';

it('deve retornar 400 com payload inválido', async () => {
  const res = await request(app).post('/tickets').send({ texto: 'curto' });
  expect(res.status).toBe(400);
});
```

- **Padronização (Unitário com Mock):** Isolar o banco de dados.

```typescript
// tests/unit/ticket.service.test.ts
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
const service = new TicketService(prismaMock); // Injeta o mock
```

### `@google/genai`

- **Funcionalidade:** SDK oficial do Gemini.
- **Padronização:** Isolar a lógica em um Service dedicado, garantindo que o "Prompt bem definido" force um retorno estrito (JSON estruturado ou texto exato).

```typescript
// services/ia.service.ts
import { GoogleGenAI } from '@google/genai';

export class IAService {
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  async classificarTicket(texto: string): Promise<string> {
    // Prompt forçando retorno exato para casar com o enum do banco
    const prompt = `Classifique o texto em: ouvidoria, sac, suporte_tecnico, financeiro, fora_do_escopo. Responda APENAS com a palavra. Texto: "${texto}"`;
    const response = await this.ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
  }
}
```

## Integração com IA: Classificação de Tickets via Gemini

Guia arquitetural para implementar o "Prompt bem definido" exigido no desafio, garantindo que a IA retorne dados estruturados, tipados e com sistema de fallback (resiliência).

### 1. O Contrato de Domínio (Interface)

A lógica de negócio não deve conhecer a API do Gemini. Dependa de uma interface para facilitar o TDD e permitir a troca de provedor de IA no futuro.

```ts
// src/domain/interfaces/ITicketClassifier.ts
export type TicketChannel = 'ouvidoria' | 'sac' | 'suporte_tecnico' | 'financeiro' | 'fora_do_escopo';
export type TicketPriority = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface ClassificationResult {
  canal: TicketChannel;
  prioridade: TicketPriority;
  revisao_manual: boolean;
}

export interface ITicketClassifier {
  classify(text: string): Promise<ClassificationResult>;
}
```

### 2. Implementação e Prompt Estruturado

Use o SDK `@google/genai` e force o `responseMimeType` para garantir um JSON limpo.

```ts
// src/infrastructure/ai/GeminiTicketClassifier.ts
import { GoogleGenAI } from '@google/genai';
import { ITicketClassifier, ClassificationResult } from '../../domain/interfaces/ITicketClassifier';
import { logger } from '../logger'; // Seu logger estruturado

export class GeminiTicketClassifier implements ITicketClassifier {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async classify(text: string): Promise<ClassificationResult> {
    try {
      const prompt = `
        Você é um classificador automático de chamados.
        Analise o texto e retorne estritamente um JSON.

        Canais:
        - ouvidoria: denuncias, assedio, fraude, corrupcao, conduta etica
        - sac: problemas com assinatura, cancelamento, entrega, atendimento
        - suporte_tecnico: erros de acesso, bugs, falhas de sistema, instabilidade
        - financeiro: cobranca, pagamento, reembolso
        - fora_do_escopo: mensagens vagas, sem contexto

        Prioridades:
        - ALTA: denuncias, assedio, fraude, situacoes sensiveis
        - MEDIA: impactos no uso do servico, acesso, cobranca
        - BAIXA: casos genericos ou sem urgencia

        Regra Extra: Sinalize revisao_manual: true se houver ambiguidade.

        Texto: "${text}"

        Retorne APENAS JSON: {"canal": "string", "prioridade": "string", "revisao_manual": boolean}
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      return JSON.parse(response.text) as ClassificationResult;
    } catch (error) {
      logger.error({ err: error, text }, 'Falha na IA, aplicando fallback');
      return this.getFallback();
    }
  }

  // 3. Estratégia de Fallback Interna
  private getFallback(): ClassificationResult {
    return {
      canal: 'fora_do_escopo',
      prioridade: 'BAIXA',
      revisao_manual: true
    };
  }
}
```

### 4. Uso no Caso de Uso (Injeção de Dependência)

O Service principal fica limpo, legível e seguro contra falhas externas.

```ts
// src/application/services/CreateTicketService.ts
import { ITicketClassifier } from '../../domain/interfaces/ITicketClassifier';
import { PrismaClient } from '@prisma/client';

export class CreateTicketService {
  constructor(
    private classifier: ITicketClassifier,
    private prisma: PrismaClient
  ) {}

  async execute(userId: number, text: string) {
    // 1. Chama a IA (se falhar, o fallback já garante o retorno)
    const classificacao = await this.classifier.classify(text);

    // 2. Persiste estruturado
    return await this.prisma.ticket.create({
      data: {
        userId,
        texto_solicitacao: text,
        canal: classificacao.canal,
        prioridade: classificacao.prioridade,
        status: 'ABERTO',
        revisao_manual: classificacao.revisao_manual
      }
    });
  }
}
```

### 5. Estratégia de Testes (Mocking)

Ao testar a criação de tickets, mocke apenas a interface. Isso torna o teste rápido, determinístico e não consome cota de API.

```ts
// tests/unit/CreateTicketService.spec.ts
import { CreateTicketService } from '../../src/application/services/CreateTicketService';
import { ITicketClassifier } from '../../src/domain/interfaces/ITicketClassifier';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('CreateTicketService', () => {
  it('deve criar um ticket com classificação injetada', async () => {
    // Mock do Classificador
    const mockClassifier: ITicketClassifier = {
      classify: jest.fn().mockResolvedValue({
        canal: 'sac',
        prioridade: 'MEDIA',
        revisao_manual: false
      })
    };

    // Mock do Prisma
    const prismaMock = mockDeep<PrismaClient>();
    prismaMock.ticket.create.mockResolvedValue({ id: 1 } as any);

    const service = new CreateTicketService(mockClassifier, prismaMock);
    await service.execute(1, 'Meu produto não chegou');

    expect(mockClassifier.classify).toHaveBeenCalledWith('Meu produto não chegou');
    expect(prismaMock.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ canal: 'sac', prioridade: 'MEDIA' })
      })
    );
  });
});
```

## Testes

- Testes Unitários (`tests/unit`): focados nos Services. Use `jest-mock-extended` para simular o `PrismaClient` e isolar o banco de dados.
- Testes de Integração (`tests/integration`): focados nas Rotas/Controllers. Use `supertest`. Enviam JSON pela rota e conferem o HTTP status code e a resposta final.

## Checklist de Novo Endpoint

- [ ] Criar/Atualizar o Schema do Zod na camada `data`.
- [ ] Adicionar o método no Service focando apenas na lógica e no Prisma.
- [ ] Criar o teste unitário do Service usando o Prisma mockado.
- [ ] Adicionar o método no Controller chamando o Service.
- [ ] Registrar a Rota usando o middleware genérico de validação com o Schema do Zod.
- [ ] Criar o teste de integração usando supertest para bater na rota.
