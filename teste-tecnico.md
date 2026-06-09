# Desafio Técnico - Back-end Junior | Node.js
## CONTATO SEGURO | ESPECIFICAÇÃO TÉCNICA

### Objetivo
Desenvolver uma API back-end simples para triagem de atendimentos, com cadastro de usuários, criação de tickets e testes automatizados. Não é necessário desenvolver frontend.

### Stack Obrigatória
* Node.js
* TypeScript
* Express
* Prisma
* PostgreSQL
* Jest

### Escopo
A API deve permitir:
* CRUD básico de user
* Criação e consulta de tickets
* Classificação automática do ticket em um canal
* Atualização de status do ticket

### Canais Esperados e Exemplos de Classificação
* **ouvidoria**: Denúncia, assédio, fraude
* **sac**: Problemas com produto, entrega ou assinatura
* **suporte_tecnico**: Erro de acesso, bug ou indisponibilidade
* **financeiro**: Cobrança ou reembolso
* **fora_do_escopo**: Mensagem vaga ou sem contexto

---

## Requisitos Obrigatórios

### 1. Usuários
Implemente um CRUD de user com os endpoints:
* `POST /users`
* `GET /users`
* `GET /users/:id`
* `PUT /users/:id`
* `DELETE /users/:id`

### 2. Tickets
Implemente os endpoints:
* `POST /tickets`
* `GET /tickets`
* `GET /tickets/:id`
* `PUT /tickets/:id/status`
* `GET /health`

Cada ticket deve ter pelo menos:
* texto da solicitação
* canal classificado
* status
* prioridade
* datas de criação e atualização

### 3. Banco de Dados
Use Prisma com PostgreSQL para persistir:
* usuários
* tickets

### 4. Regras de Negócio
A solução deve:
* classificar o canal do ticket
* definir prioridade inicial (baixa, média, alta)
* marcar casos ambíguos para revisão manual, se necessário

Considere pelo menos as seguintes regras:

| Canal | Regra |
| :--- | :--- |
| **ouvidoria** | denúncias, assédio, fraude, corrupção ou temas de conduta ética |
| **sac** | problemas com assinatura, cancelamento, entrega ou atendimento |
| **suporte_tecnico** | erros de acesso, bugs, falhas de sistema ou instabilidade |
| **financeiro** | cobrança, pagamento ou reembolso |
| **fora_do_escopo** | mensagens vagas, sem contexto suficiente ou fora do cenário |

Para prioridade inicial, considere como referência:
* **ALTA**: denúncias, assédio, fraude e situações sensíveis
* **MÉDIA**: impactos no uso do serviço, acesso ou cobrança
* **BAIXA**: casos genéricos ou sem urgência evidente

### 5. Testes
Implemente testes automatizados com Jest cobrindo pelo menos:
* CRUD de user
* criação de ticket
* classificação dos canais

### 6. Documentação
Entregue um `README.md` com:
* instruções para rodar o projeto
* instruções para rodar os testes
* tecnologias utilizadas
* exemplos de requisição

---

## Diferenciais
* Estrutura em camadas
* Docker ou docker-compose
* Logs estruturados
* Prompt bem definido para classificação por IA
* Coleção Postman ou arquivo `.http`

## Entregáveis
1. Código-fonte em repositório Git
2. `README.md`
3. Schema e migrations do Prisma
4. Testes automatizados
