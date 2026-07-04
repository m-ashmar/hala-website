import prisma from '../prisma';
import { Prisma } from '@prisma/client';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

export const userRepository = new UserRepository();
