import { createTicketClassifier } from '../../src/services/create-ticket-classifier';
import { GeminiTicketClassifier } from '../../src/services/gemini-ticket-classifier';
import { RuleBasedTicketClassifier } from '../../src/services/rule-based-ticket-classifier';

describe('createTicketClassifier', () => {
  it('returns the local classifier when the provider is rule_based', () => {
    const classifier = createTicketClassifier({
      TICKET_CLASSIFIER_PROVIDER: 'rule_based',
      GEMINI_MODEL: 'gemini-2.5-flash',
      GEMINI_TIMEOUT_MS: 5000,
      GEMINI_MAX_RETRIES: 1
    });

    expect(classifier).toBeInstanceOf(RuleBasedTicketClassifier);
  });

  it('returns the Gemini classifier when the provider is gemini', () => {
    const classifier = createTicketClassifier({
      TICKET_CLASSIFIER_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'gemini-2.5-flash',
      GEMINI_TIMEOUT_MS: 5000,
      GEMINI_MAX_RETRIES: 1
    });

    expect(classifier).toBeInstanceOf(GeminiTicketClassifier);
  });
});
