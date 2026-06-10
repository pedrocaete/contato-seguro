import { GoogleGenAI } from '@google/genai';

import { logger } from '../lib/logger';
import {
  ClassificationResult,
  ClassificationResultSchema,
  classificationResponseJsonSchema,
  ITicketClassifier
} from './ticket-classifier';

type GenerateContentParams = {
  model: string;
  contents: string;
  config: {
    responseMimeType: 'application/json';
    responseJsonSchema: typeof classificationResponseJsonSchema;
  };
};

type GenerateContentResult = {
  text?: string;
};

type GenerateContentClient = {
  generateContent(params: GenerateContentParams): Promise<GenerateContentResult>;
};

export class GeminiTicketClassifier implements ITicketClassifier {
  constructor(
    private readonly model: string,
    private readonly client: GenerateContentClient,
    private readonly fallback: ITicketClassifier,
    private readonly timeoutMs: number,
    private readonly maxRetries: number
  ) {}

  static create(
    apiKey: string,
    model: string,
    fallback: ITicketClassifier,
    timeoutMs: number,
    maxRetries: number
  ): GeminiTicketClassifier {
    return new GeminiTicketClassifier(
      model,
      new GoogleGenAI({ apiKey }).models,
      fallback,
      timeoutMs,
      maxRetries
    );
  }

  async classify(text: string): Promise<ClassificationResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await withTimeout(
          this.client.generateContent({
            model: this.model,
            contents: buildClassificationPrompt(text),
            config: {
              responseMimeType: 'application/json',
              responseJsonSchema: classificationResponseJsonSchema
            }
          }),
          this.timeoutMs
        );

        const classification = parseClassificationResult(response.text);

        logger.info(
          {
            action: 'classify_ticket',
            external_system: 'google_genai',
            model: this.model,
            attempt: attempt + 1,
            channel: classification.channel,
            priority: classification.priority,
            manualReview: classification.manualReview,
            confidence: classification.confidence,
            alternatives: classification.alternatives
          },
          'Ticket classified with Gemini'
        );

        return classification;
      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries) {
          logger.warn(
            {
              action: 'classify_ticket',
              external_system: 'google_genai',
              model: this.model,
              attempt: attempt + 1,
              maxRetries: this.maxRetries,
              err: error
            },
            'Gemini classification attempt failed, retrying'
          );
        }
      }
    }

    logger.warn(
      {
        action: 'classify_ticket',
        external_system: 'google_genai',
        model: this.model,
        maxRetries: this.maxRetries,
        err: lastError
      },
      'Gemini classification failed, using rule-based fallback'
    );

    return this.fallback.classify(text);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Gemini classification timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      promise.then(
        (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

function buildClassificationPrompt(text: string): string {
  return [
    'You are an automatic ticket classifier for a Portuguese customer support system.',
    'Classify the request and return only valid JSON.',
    'Allowed channels: OUVIDORIA, SAC, SUPORTE_TECNICO, FINANCEIRO, FORA_DO_ESCOPO.',
    'Allowed priorities: ALTA, MEDIA, BAIXA.',
    'Set manualReview to true when the request is ambiguous, vague or lacks enough context.',
    'Use these rules:',
    '- OUVIDORIA: denuncia, assedio, fraude, corrupcao, etica, conduta',
    '- SAC: assinatura, cancelamento, entrega, produto, atendimento',
    '- SUPORTE_TECNICO: erro, acesso, bug, falha, instabilidade, sistema',
    '- FINANCEIRO: cobranca, pagamento, reembolso, fatura',
    '- FORA_DO_ESCOPO: mensagens vagas, sem contexto suficiente ou fora do cenario',
    'Return exactly this shape: {"channel":"SAC","priority":"MEDIA","manualReview":false,"confidence":0.84,"alternatives":["FINANCEIRO"]}.',
    `Ticket text: """${text}"""`
  ].join('\n');
}

function parseClassificationResult(text: string | undefined): ClassificationResult {
  if (!text) {
    throw new Error('Gemini returned an empty classification response');
  }

  return ClassificationResultSchema.parse(JSON.parse(text));
}
