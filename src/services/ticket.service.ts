import { PrismaClient, Ticket } from '@prisma/client';

import { CreateTicketData, ListTicketsQueryData, UpdateTicketStatusData } from '../data/ticket.data';
import { AppError } from '../lib/app-error';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { classificationConfidenceThreshold, ClassificationResult, ITicketClassifier } from './ticket-classifier';
import { RuleBasedTicketClassifier } from './rule-based-ticket-classifier';

export class TicketService {
  constructor(
    private readonly prismaClient: PrismaClient = prisma,
    private readonly classifier: ITicketClassifier = new RuleBasedTicketClassifier()
  ) {}

  async create(data: CreateTicketData): Promise<Ticket> {
    await this.ensureUserExists(data.userId);

    const classification = await this.classifier.classify(data.requestText);
    const normalizedClassification = normalizeClassificationResult(classification);

    logManualReviewPromotion(data.userId, classification, normalizedClassification);

    return this.prismaClient.ticket.create({
      data: {
        userId: data.userId,
        requestText: data.requestText,
        channel: normalizedClassification.channel,
        priority: normalizedClassification.priority,
        manualReview: normalizedClassification.manualReview,
        classificationConfidence: normalizedClassification.confidence,
        classificationAlternatives: normalizedClassification.alternatives
      }
    });
  }

  async findAll(filters: ListTicketsQueryData): Promise<Ticket[]> {
    return this.prismaClient.ticket.findMany({
      where: filters,
      orderBy: {
        id: 'asc'
      }
    });
  }

  async findById(id: number): Promise<Ticket> {
    const ticket = await this.prismaClient.ticket.findUnique({
      where: { id }
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    return ticket;
  }

  async updateStatus(id: number, data: UpdateTicketStatusData): Promise<Ticket> {
    await this.findById(id);

    return this.prismaClient.ticket.update({
      where: { id },
      data
    });
  }

  private async ensureUserExists(userId: number): Promise<void> {
    const user = await this.prismaClient.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }
  }
}

function normalizeClassificationResult(classification: ClassificationResult): ClassificationResult {
  const alternatives = deduplicateAlternativeChannels(classification.channel, classification.alternatives);
  const manualReview =
    classification.manualReview ||
    classification.confidence < classificationConfidenceThreshold ||
    alternatives.length > 0;

  return {
    ...classification,
    manualReview,
    alternatives
  };
}

function deduplicateAlternativeChannels(
  channel: ClassificationResult['channel'],
  alternatives: ClassificationResult['alternatives']
): ClassificationResult['alternatives'] {
  return [...new Set(alternatives)].filter((alternative) => alternative !== channel);
}

function logManualReviewPromotion(
  userId: number,
  originalClassification: ClassificationResult,
  normalizedClassification: ClassificationResult
): void {
  if (!normalizedClassification.manualReview) {
    return;
  }

  const reasons = getManualReviewReasons(originalClassification, normalizedClassification);

  logger.info(
    {
      action: 'classify_ticket',
      userId,
      channel: normalizedClassification.channel,
      priority: normalizedClassification.priority,
      confidence: normalizedClassification.confidence,
      alternatives: normalizedClassification.alternatives,
      manualReviewReasons: reasons
    },
    'Ticket promoted to manual review'
  );
}

function getManualReviewReasons(
  originalClassification: ClassificationResult,
  normalizedClassification: ClassificationResult
): string[] {
  const reasons: string[] = [];

  if (normalizedClassification.confidence < classificationConfidenceThreshold) {
    reasons.push('low_confidence');
  }

  if (normalizedClassification.alternatives.length > 0) {
    reasons.push('has_alternatives');
  }

  if (originalClassification.manualReview) {
    reasons.push('classifier_flagged_review');
  }

  return reasons;
}
