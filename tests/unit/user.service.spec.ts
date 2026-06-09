import { mockDeep } from 'jest-mock-extended';
import { Prisma, PrismaClient, User } from '@prisma/client';

import { AppError } from '../../src/lib/app-error';
import { UserService } from '../../src/services/user.service';

describe('UserService', () => {
  const prismaMock = mockDeep<PrismaClient>();
  const service = new UserService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a user', async () => {
    const user = {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    } satisfies User;

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(user);

    const result = await service.create({
      name: 'Alice',
      email: 'alice@example.com'
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Alice',
        email: 'alice@example.com'
      }
    });
    expect(result).toEqual(user);
  });

  it('fails when creating a user with an existing email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(
      service.create({
        name: 'Alice',
        email: 'alice@example.com'
      })
    ).rejects.toThrow(new AppError('Email already in use', 409));
  });

  it('returns 409 when create hits the database unique constraint', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: '5.22.0',
        code: 'P2002'
      })
    );

    await expect(
      service.create({
        name: 'Alice',
        email: 'alice@example.com'
      })
    ).rejects.toThrow(new AppError('Email already in use', 409));
  });

  it('returns all users', async () => {
    const users = [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ] satisfies User[];

    prismaMock.user.findMany.mockResolvedValue(users);

    const result = await service.findAll();

    expect(prismaMock.user.findMany).toHaveBeenCalled();
    expect(result).toEqual(users);
  });

  it('returns a user by id', async () => {
    const user = {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    } satisfies User;

    prismaMock.user.findUnique.mockResolvedValue(user);

    const result = await service.findById(1);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 }
    });
    expect(result).toEqual(user);
  });

  it('fails when user is not found by id', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.findById(1)).rejects.toThrow(new AppError('User not found', 404));
  });

  it('updates a user', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .mockResolvedValueOnce(null);

    prismaMock.user.update.mockResolvedValue({
      id: 1,
      name: 'Alice Updated',
      email: 'alice.updated@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await service.update(1, {
      name: 'Alice Updated',
      email: 'alice.updated@example.com'
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'Alice Updated',
        email: 'alice.updated@example.com'
      }
    });
    expect(result.name).toBe('Alice Updated');
  });

  it('fails when updating a non-existing user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.update(1, { name: 'Alice Updated' })).rejects.toThrow(
      new AppError('User not found', 404)
    );
  });

  it('fails when updating to an email already used by another user', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .mockResolvedValueOnce({
        id: 2,
        name: 'Bob',
        email: 'bob@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      });

    await expect(service.update(1, { email: 'bob@example.com' })).rejects.toThrow(
      new AppError('Email already in use', 409)
    );
  });

  it('returns 409 when update hits the database unique constraint', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .mockResolvedValueOnce(null);
    prismaMock.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: '5.22.0',
        code: 'P2002'
      })
    );

    await expect(service.update(1, { email: 'alice.updated@example.com' })).rejects.toThrow(
      new AppError('Email already in use', 409)
    );
  });

  it('deletes a user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.user.delete.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await service.delete(1);

    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: 1 }
    });
  });

  it('fails when deleting a non-existing user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.delete(1)).rejects.toThrow(new AppError('User not found', 404));
  });
});
