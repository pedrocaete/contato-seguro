import { env } from '../lib/env';
import { GeminiTicketClassifier } from './gemini-ticket-classifier';
import { RuleBasedTicketClassifier } from './rule-based-ticket-classifier';
import { ITicketClassifier } from './ticket-classifier';

type TicketClassifierSettings = {
  TICKET_CLASSIFIER_PROVIDER: 'rule_based' | 'gemini';
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
};

export function createTicketClassifier(
  settings: TicketClassifierSettings = env
): ITicketClassifier {
  const fallback = new RuleBasedTicketClassifier();

  if (settings.TICKET_CLASSIFIER_PROVIDER === 'rule_based') {
    return fallback;
  }

  return GeminiTicketClassifier.create(settings.GEMINI_API_KEY!, settings.GEMINI_MODEL, fallback);
}
