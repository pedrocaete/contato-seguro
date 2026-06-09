import { Prisma, PrismaClient, User } from '@prisma/client';

import { CreateUserData, UpdateUserData } from '../data/user.data';
import { AppError } from '../lib/app-error';
import { prisma } from '../lib/prisma';

export class UserService {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async create(data: CreateUserData): Promise<User> {
    await this.ensureEmailAvailable(data.email);

    try {
      return await this.prismaClient.user.create({
        data
      });
    } catch (error) {
      throwIfEmailAlreadyExists(error);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return this.prismaClient.user.findMany({
      orderBy: {
        id: 'asc'
      }
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.prismaClient.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async update(id: number, data: UpdateUserData): Promise<User> {
    await this.findById(id);

    if (data.email) {
      await this.ensureEmailAvailable(data.email, id);
    }

    try {
      return await this.prismaClient.user.update({
        where: { id },
        data
      });
    } catch (error) {
      throwIfEmailAlreadyExists(error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);

    await this.prismaClient.user.delete({
      where: { id }
    });
  }

  private async ensureEmailAvailable(email: string, currentUserId?: number): Promise<void> {
    const existingUser = await this.prismaClient.user.findUnique({
      where: { email }
    });

    if (!existingUser) {
      return;
    }

    if (currentUserId && existingUser.id === currentUserId) {
      return;
    }

    throw new AppError('Email already in use', 409);
  }
}

function throwIfEmailAlreadyExists(error: unknown): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError('Email already in use', 409);
  }
}
