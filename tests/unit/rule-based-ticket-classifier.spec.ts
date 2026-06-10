import { RuleBasedTicketClassifier } from '../../src/services/rule-based-ticket-classifier';

describe('RuleBasedTicketClassifier', () => {
  const classifier = new RuleBasedTicketClassifier();

  it('classifies complaint tickets', async () => {
    const result = await classifier.classify('Quero denunciar fraude e assedio no atendimento.');

    expect(result).toEqual({
      channel: 'OUVIDORIA',
      priority: 'ALTA',
      manualReview: false,
      confidence: 0.68,
      alternatives: ['SAC']
    });
  });

  it('classifies customer service tickets', async () => {
    const result = await classifier.classify('Minha assinatura foi cancelada e o produto nao chegou.');

    expect(result).toEqual({
      channel: 'SAC',
      priority: 'MEDIA',
      manualReview: false,
      confidence: 0.9,
      alternatives: []
    });
  });

  it('classifies technical support tickets', async () => {
    const result = await classifier.classify('Estou com erro de acesso e o sistema apresenta bug.');

    expect(result).toEqual({
      channel: 'SUPORTE_TECNICO',
      priority: 'MEDIA',
      manualReview: false,
      confidence: 0.9,
      alternatives: []
    });
  });

  it('classifies finance tickets', async () => {
    const result = await classifier.classify('Preciso de reembolso por cobranca indevida no pagamento.');

    expect(result).toEqual({
      channel: 'FINANCEIRO',
      priority: 'MEDIA',
      manualReview: false,
      confidence: 0.9,
      alternatives: []
    });
  });

  it('marks out of scope tickets for manual review', async () => {
    const result = await classifier.classify('Oi, tudo bem?');

    expect(result).toEqual({
      channel: 'FORA_DO_ESCOPO',
      priority: 'BAIXA',
      manualReview: true,
      confidence: 0.2,
      alternatives: []
    });
  });

  it('marks ambiguous tickets for manual review', async () => {
    const result = await classifier.classify('Tenho erro e cobranca indevida.');

    expect(result).toEqual({
      channel: 'SUPORTE_TECNICO',
      priority: 'MEDIA',
      manualReview: true,
      confidence: 0.55,
      alternatives: ['FINANCEIRO']
    });
  });
});
