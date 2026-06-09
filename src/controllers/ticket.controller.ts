import { Request, Response } from 'express';

import { TicketService } from '../services/ticket.service';

export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  async create(req: Request, res: Response): Promise<void> {
    const ticket = await this.ticketService.create(req.body);

    res.status(201).json(ticket);
  }

  async index(req: Request, res: Response): Promise<void> {
    const tickets = await this.ticketService.findAll(req.query);

    res.status(200).json(tickets);
  }

  async show(req: Request, res: Response): Promise<void> {
    const ticket = await this.ticketService.findById(Number(req.params.id));

    res.status(200).json(ticket);
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const ticket = await this.ticketService.updateStatus(Number(req.params.id), req.body);

    res.status(200).json(ticket);
  }
}
