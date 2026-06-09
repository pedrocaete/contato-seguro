# contato-seguro

API de triagem de tickets com foco em padronização de backend, validação, logging e integração com IA.

## Visão Geral

Este repositório concentra as diretrizes arquiteturais e operacionais do projeto. O objetivo é manter a API previsível, testável e consistente mesmo sob crescimento de carga.

O ambiente de desenvolvimento foi preparado para rodar via Docker, com aplicação Node.js e PostgreSQL em containers separados.

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

Containers padrão:

- App: `test_contato_seguro`
- Banco: `test_contato_seguro_db`

## Diretrizes Principais

- Use controllers finos, com regra de negócio concentrada em services.
- Valide entrada HTTP com Zod e mantenha a camada `data` como fonte de tipagem.
- Centralize tratamento de erros em middleware global.
- Faça logging estruturado apenas quando houver valor operacional real.
- Para cenários de alto volume, prefira processamento assíncrono da classificação por IA e uso de filas para atualizar o estado.

## Documentação Técnica

- [backend-guideline.md](./backend-guideline.md): guia único com arquitetura, logging, pacotes, testes e integração com Gemini.
- [teste-tecnico.md](./teste-tecnico.md): enunciado do teste técnico.
- `desafio_tecnico_contato_seguro_2 (1) (1).pdf`: material original do desafio.

## Observação de Escala

Quando o volume de acesso crescer significativamente, considere reduzir ruído de logs e registrar apenas o necessário para operação.
