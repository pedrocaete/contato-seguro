import { logger } from '../../src/lib/logger';
import { GeminiTicketClassifier } from '../../src/services/gemini-ticket-classifier';
import { ITicketClassifier } from '../../src/services/ticket-classifier';

describe('GeminiTicketClassifier', () => {
  const fallback: jest.Mocked<ITicketClassifier> = {
    classify: jest.fn()
  };

  const client = {
    generateContent: jest.fn()
  };

  const classifier = new GeminiTicketClassifier('gemini-2.5-flash', client, fallback);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the strict parsed classification when Gemini responds with valid JSON', async () => {
    client.generateContent.mockResolvedValue({
      text: JSON.stringify({
        channel: 'SAC',
        priority: 'MEDIA',
        manualReview: false
      })
    });

    const result = await classifier.classify('Meu produto nao chegou e quero cancelar a assinatura.');

    expect(client.generateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: expect.stringContaining('Meu produto nao chegou e quero cancelar a assinatura.'),
      config: expect.objectContaining({
        responseMimeType: 'application/json',
        responseJsonSchema: expect.any(Object)
      })
    });
    expect(result).toEqual({
      channel: 'SAC',
      priority: 'MEDIA',
      manualReview: false
    });
  });

  it('uses the fallback when Gemini returns invalid JSON for the contract', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    client.generateContent.mockResolvedValue({
      text: JSON.stringify({
        channel: 'INVALIDO',
        priority: 'MEDIA',
        manualReview: false
      })
    });
    fallback.classify.mockResolvedValue({
      channel: 'FORA_DO_ESCOPO',
      priority: 'BAIXA',
      manualReview: true
    });

    const result = await classifier.classify('Mensagem vaga');

    expect(fallback.classify).toHaveBeenCalledWith('Mensagem vaga');
    expect(warnSpy).toHaveBeenCalled();
    expect(result).toEqual({
      channel: 'FORA_DO_ESCOPO',
      priority: 'BAIXA',
      manualReview: true
    });
  });

  it('uses the fallback when Gemini returns an empty response', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    client.generateContent.mockResolvedValue({});
    fallback.classify.mockResolvedValue({
      channel: 'FORA_DO_ESCOPO',
      priority: 'BAIXA',
      manualReview: true
    });

    const result = await classifier.classify('Oi');

    expect(fallback.classify).toHaveBeenCalledWith('Oi');
    expect(warnSpy).toHaveBeenCalled();
    expect(result.manualReview).toBe(true);
  });

  it('uses the fallback when the SDK request fails', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    client.generateContent.mockRejectedValue(new Error('timeout'));
    fallback.classify.mockResolvedValue({
      channel: 'SUPORTE_TECNICO',
      priority: 'MEDIA',
      manualReview: true
    });

    const result = await classifier.classify('Estou com erro de acesso.');

    expect(fallback.classify).toHaveBeenCalledWith('Estou com erro de acesso.');
    expect(warnSpy).toHaveBeenCalled();
    expect(result).toEqual({
      channel: 'SUPORTE_TECNICO',
      priority: 'MEDIA',
      manualReview: true
    });
  });
});
