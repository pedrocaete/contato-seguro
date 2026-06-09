import { TicketChannel, TicketPriority } from '@prisma/client';

import { ClassificationResult, ITicketClassifier } from './ticket-classifier';

type CategoryRule = {
  channel: TicketChannel;
  keywords: string[];
  priority: TicketPriority;
};

const categoryRules: CategoryRule[] = [
  {
    channel: 'OUVIDORIA',
    keywords: ['denuncia', 'assedio', 'fraude', 'corrupcao', 'etica'],
    priority: 'ALTA'
  },
  {
    channel: 'SAC',
    keywords: ['assinatura', 'cancelamento', 'cancelar', 'entrega', 'produto', 'atendimento'],
    priority: 'MEDIA'
  },
  {
    channel: 'SUPORTE_TECNICO',
    keywords: ['erro', 'acesso', 'bug', 'falha', 'instabilidade', 'sistema'],
    priority: 'MEDIA'
  },
  {
    channel: 'FINANCEIRO',
    keywords: ['cobranca', 'pagamento', 'reembolso', 'fatura'],
    priority: 'MEDIA'
  }
];

export class RuleBasedTicketClassifier implements ITicketClassifier {
  async classify(text: string): Promise<ClassificationResult> {
    const normalizedText = normalizeText(text);
    const matches = categoryRules
      .map((rule) => ({
        channel: rule.channel,
        priority: rule.priority,
        score: countMatches(normalizedText, rule.keywords)
      }))
      .filter((rule) => rule.score > 0)
      .sort((left, right) => right.score - left.score);

    if (matches.length === 0) {
      return {
        channel: 'FORA_DO_ESCOPO',
        priority: 'BAIXA',
        manualReview: true
      };
    }

    const [winner, second] = matches;

    return {
      channel: winner.channel,
      priority: winner.priority,
      manualReview: Boolean(second && second.score === winner.score)
    };
  }
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.reduce((score, keyword) => score + Number(text.includes(keyword)), 0);
}
