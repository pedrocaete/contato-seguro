import { PrismaClient, Ticket } from '@prisma/client';

import { CreateTicketData, ListTicketsQueryData, UpdateTicketStatusData } from '../data/ticket.data';
import { AppError } from '../lib/app-error';
import { prisma } from '../lib/prisma';
import { ITicketClassifier } from './ticket-classifier';
import { RuleBasedTicketClassifier } from './rule-based-ticket-classifier';

export class TicketService {
  constructor(
    private readonly prismaClient: PrismaClient = prisma,
    private readonly classifier: ITicketClassifier = new RuleBasedTicketClassifier()
  ) {}

  async create(data: CreateTicketData): Promise<Ticket> {
    await this.ensureUserExists(data.userId);

    const classification = await this.classifier.classify(data.requestText);

    return this.prismaClient.ticket.create({
      data: {
        ...data,
        ...classification
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
