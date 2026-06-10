import { env } from '../lib/env';
import { GeminiTicketClassifier } from './gemini-ticket-classifier';
import { RuleBasedTicketClassifier } from './rule-based-ticket-classifier';
import { ITicketClassifier } from './ticket-classifier';
import { logger } from '../lib/logger';

type TicketClassifierSettings = {
  TICKET_CLASSIFIER_PROVIDER: 'rule_based' | 'gemini';
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  GEMINI_TIMEOUT_MS: number;
  GEMINI_MAX_RETRIES: number;
};

export function createTicketClassifier(
  settings: TicketClassifierSettings = env
): ITicketClassifier {
  const fallback = new RuleBasedTicketClassifier();

  if (settings.TICKET_CLASSIFIER_PROVIDER === 'rule_based') {
    return fallback;
  }

  if (!settings.GEMINI_API_KEY) {
    logger.warn(
      { provider: 'gemini', reason: 'GEMINI_API_KEY missing' },
      'Falling back to RuleBasedTicketClassifier.'
    );
    return fallback;
  }

  return GeminiTicketClassifier.create(
    settings.GEMINI_API_KEY,
    settings.GEMINI_MODEL,
    fallback,
    settings.GEMINI_TIMEOUT_MS,
    settings.GEMINI_MAX_RETRIES
  );
}
