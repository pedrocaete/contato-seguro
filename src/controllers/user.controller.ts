import { Request, Response } from 'express';

import { UserService } from '../services/user.service';

export class UserController {
  constructor(private readonly userService: UserService) {}

  async create(req: Request, res: Response): Promise<void> {
    const user = await this.userService.create(req.body);

    res.status(201).json(user);
  }

  async index(_req: Request, res: Response): Promise<void> {
    const users = await this.userService.findAll();

    res.status(200).json(users);
  }

  async show(req: Request, res: Response): Promise<void> {
    const user = await this.userService.findById(Number(req.params.id));

    res.status(200).json(user);
  }

  async update(req: Request, res: Response): Promise<void> {
    const user = await this.userService.update(Number(req.params.id), req.body);

    res.status(200).json(user);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.userService.delete(Number(req.params.id));

    res.status(204).send();
  }
}
