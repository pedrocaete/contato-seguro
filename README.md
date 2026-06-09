# contato-seguro

API de triagem de tickets com foco em padronização de backend, validação, logging e integração com IA.

## Visão Geral

Este repositório concentra as diretrizes arquiteturais e operacionais do projeto. O objetivo é manter a API previsível, testável e consistente mesmo sob crescimento de carga.

## Diretrizes Principais

- Use controllers finos, com regra de negócio concentrada em services.
- Valide entrada HTTP com Zod e mantenha os DTOs como fonte de tipagem.
- Centralize tratamento de erros em middleware global.
- Faça logging estruturado apenas quando houver valor operacional real.
- Para cenários de alto volume, prefira processamento assíncrono da classificação por IA e uso de filas para atualizar o estado.

## Documentação Técnica

- [backend-guideline.md](./backend-guideline.md): guia único com arquitetura, logging, pacotes, testes e integração com Gemini.
- [teste-tecnico.md](./teste-tecnico.md): enunciado do teste técnico.
- `desafio_tecnico_contato_seguro_2 (1) (1).pdf`: material original do desafio.

## Observação de Escala

Quando o volume de acesso crescer significativamente, considere reduzir ruído de logs e registrar apenas o necessário para operação.
